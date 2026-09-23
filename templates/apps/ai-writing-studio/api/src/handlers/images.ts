/**
 * Images handler — DALL-E (or other bonded image-generation provider)
 * cover-image generation. The bond contract is:
 *   - `getProvider()` returns the bonded provider, or `null` when verify-time
 *     placeholder credentials are in use.
 *   - `provider.generate({ prompt, size, style, model })` returns a result
 *     with `images: [{ url, revisedPrompt }, ...]`.
 *
 * Persistence: every successful generation writes one row to
 * `generated_images` (user-scoped). When `document_id` is supplied AND the
 * caller owns that document, the document's `cover_image_url` is also
 * patched in a single round-trip.
 *
 * S3 streaming is intentionally NOT done in v1 — DALL-E URLs are short-lived
 * (1 hour for OpenAI), but the persisted row keeps the `revised_prompt` and
 * `model` for analytics. A v2 background job can re-host expired URLs.
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getProvider as getImageProvider,
  type ImageGenerateParams,
  type ImageGenerationResult,
} from '@molecule/api-ai-image-generation'
import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { AiWritingStudioLimits } from '../tiers.js'

const router = Router()

// Enforce the per-tier `maxImages` limit (free=5) the pricing page advertises;
// each generation persists a `generated_images` row, so that count is the usage.
const enforceMaxImages = enforceLimit<AiWritingStudioLimits>({
  limitType: 'maxImages',
  getLimit: (limits) => limits.maxImages,
  getCurrent: async (userId) =>
    count('generated_images', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const generateSchema = z.object({
  prompt: z.string().min(1),
  size: z.string().optional(),
  style: z.string().optional(),
  model: z.string().optional(),
  document_id: z.string().optional(),
})

interface GeneratedRow {
  imageUrl: string
  revisedPrompt: string | null
}

class ImageProviderUnavailableError extends Error {
  constructor() {
    super('No image-generation provider is bonded')
    this.name = 'ImageProviderUnavailableError'
  }
}

async function runImageProvider(params: ImageGenerateParams): Promise<GeneratedRow> {
  const provider = getImageProvider()
  if (!provider) throw new ImageProviderUnavailableError()
  const result: ImageGenerationResult = await provider.generate(params)
  const first = result.images?.[0]
  // gpt-image-1 returns base64 (no URL). Normalize to a data: URL so the
  // <img src> works directly. Falls back to the URL form for older models.
  const imageUrl = first?.url ?? (first?.base64 ? `data:image/png;base64,${first.base64}` : null)
  if (!imageUrl) {
    throw new Error('Image-generation provider returned no images')
  }
  return {
    imageUrl,
    revisedPrompt: first?.revisedPrompt ?? null,
  }
}

router.post(
  '/generate',
  enforceMaxImages,
  validateBody(generateSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof generateSchema>
    const size = body.size ?? '1024x1024'
    const model = body.model ?? 'gpt-image-1'
    let generated: GeneratedRow
    try {
      generated = await runImageProvider({
        prompt: body.prompt,
        size,
        style: body.style,
        model,
      })
    } catch (error) {
      const status = error instanceof ImageProviderUnavailableError ? 503 : 502
      logger.error('images.generate', error)
      res.status(status).json({
        error:
          error instanceof Error
            ? error.message
            : t('images.generationFailed', {}, { defaultValue: 'Image generation failed.' }),
      })
      return
    }
    const row = await create('generated_images', {
      user_id: userId,
      document_id: body.document_id ?? null,
      prompt: body.prompt,
      revised_prompt: generated.revisedPrompt,
      url: generated.imageUrl,
      model,
      size,
      created_at: new Date(),
    })
    res.status(201).json({
      url: generated.imageUrl,
      revisedPrompt: generated.revisedPrompt,
      record: row.data,
    })
  },
)

const generateAndSaveSchema = generateSchema.extend({
  document_id: z.string().min(1),
})

router.post(
  '/generate-and-save',
  enforceMaxImages,
  validateBody(generateAndSaveSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof generateAndSaveSchema>
    const doc = await findById<Record<string, unknown>>('documents', body.document_id)
    if (!doc || doc.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const size = body.size ?? '1024x1024'
    const model = body.model ?? 'gpt-image-1'
    let generated: GeneratedRow
    try {
      generated = await runImageProvider({
        prompt: body.prompt,
        size,
        style: body.style,
        model,
      })
    } catch (error) {
      const status = error instanceof ImageProviderUnavailableError ? 503 : 502
      logger.error('images.generateAndSave', error)
      res.status(status).json({
        error:
          error instanceof Error
            ? error.message
            : t('images.generationFailed', {}, { defaultValue: 'Image generation failed.' }),
      })
      return
    }
    const row = await create('generated_images', {
      user_id: userId,
      document_id: body.document_id,
      prompt: body.prompt,
      revised_prompt: generated.revisedPrompt,
      url: generated.imageUrl,
      model,
      size,
      created_at: new Date(),
    })
    await updateById('documents', body.document_id, {
      cover_image_url: generated.imageUrl,
      updated_at: new Date(),
    })
    res.status(201).json({
      url: generated.imageUrl,
      revisedPrompt: generated.revisedPrompt,
      record: row.data,
    })
  },
)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const { document_id } = req.query as Record<string, string | undefined>
    if (document_id) {
      where.push({ field: 'document_id', operator: '=', value: document_id })
    }
    const rows = await findMany('generated_images', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    res.json(rows)
  } catch (error) {
    logger.error('images.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = String(req.params.id)
    const row = await findById<Record<string, unknown>>('generated_images', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Image not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('images.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
