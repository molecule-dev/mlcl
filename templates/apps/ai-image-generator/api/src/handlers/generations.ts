/**
 * Generations handler — owns the AI-image-generation lifecycle (request,
 * variation, prompt-enhance, list, by-id read).
 *
 * Uses the abstract DataStore (`@molecule/api-database`) for persistence.
 * Vendor calls are routed through `@molecule/api-ai-image-generation` and
 * `@molecule/api-ai` providers via the standard bond pattern (`require`/
 * `getProvider`); this handler never imports a vendor SDK directly.
 *
 * The actual `requireProvider().generate(...)` round-trip to OpenAI / Stability
 * is wired but only fires when a real provider is bonded — the verify gate
 * runs against placeholder credentials and surfaces failed provider calls
 * as 502 (rather than crashing the request).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  type AIProvider,
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import {
  getProvider as getImageProvider,
  type ImageGenerateParams,
  type ImageGenerationResult,
} from '@molecule/api-ai-image-generation'
import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { connect, create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

/**
 * Fixed credit cost per generation. The pricing page advertises a
 * credits-per-month allowance; each generation must debit this amount
 * from the user's `credit_ledger` so the dashboard balance reflects
 * real consumption (not just the signup grant).
 */
const CREDIT_COST_PER_GENERATION = 10

interface UserActiveSelections {
  id: string
  oauthData?: { activeModel?: string; activeStyleId?: string } | null
}

interface StylePresetRow {
  id: string
  prompt_modifier?: string | null
  negative_modifier?: string | null
}

/**
 * Atomically reserve `cost` credits for a user, or report an insufficient balance —
 * WITHOUT the check-then-debit race. The balance is a SUM over `credit_ledger`, which a
 * plain conditional INSERT can't guard under READ COMMITTED (two concurrent inserts both
 * read the pre-insert sum, both pass, both debit → the user overspends, e.g. 1 credit →
 * N free generations by firing N requests at once). Serialize per-user with a
 * transaction-scoped advisory lock, then check + insert the debit as one unit. Reserve
 * BEFORE the provider round-trip and `refundCredit()` if it then fails, so a failed
 * generation still costs nothing.
 */
export async function reserveCredit(
  userId: string,
  cost: number,
  reason: string,
): Promise<{ ok: boolean; balance: number; ledgerId: string | null }> {
  const conn = await connect()
  try {
    await conn.query('BEGIN')
    // Transaction-scoped, per-user lock (released on COMMIT/ROLLBACK); namespaced so it
    // can't collide with any other advisory lock the app might take.
    await conn.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`aig-credits:${userId}`])
    const balRes = await conn.query<{ balance: number }>(
      `SELECT COALESCE(SUM(delta), 0)::int AS balance FROM credit_ledger WHERE user_id = $1`,
      [userId],
    )
    const balance = balRes.rows[0]?.balance ?? 0
    if (balance < cost) {
      await conn.query('ROLLBACK')
      return { ok: false, balance, ledgerId: null }
    }
    const ins = await conn.query<{ id: string }>(
      `INSERT INTO credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3) RETURNING id`,
      [userId, -cost, reason],
    )
    await conn.query('COMMIT')
    return { ok: true, balance, ledgerId: ins.rows[0]?.id ?? null }
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    conn.release()
  }
}

/** Refund a previously-reserved credit hold when the paid-for work then failed. */
async function refundCredit(
  userId: string,
  cost: number,
  reserveLedgerId: string | null,
): Promise<void> {
  await create('credit_ledger', {
    user_id: userId,
    delta: cost,
    reason: 'refund',
    reference_id: reserveLedgerId,
  })
}

/**
 * Compose the user-typed prompt with the active style preset's
 * `prompt_modifier`. The original prompt is preserved verbatim in
 * `generations.prompt`; the augmented prompt is what we actually send
 * to the upstream image provider so the active style materially
 * affects the output (and isn't pure write-only state on the user
 * profile).
 */
function applyStyleToPrompt(prompt: string, style: StylePresetRow | null): string {
  const modifier = style?.prompt_modifier?.trim()
  if (!modifier) return prompt
  return `${prompt}, ${modifier}`
}

/**
 * Bake the negative prompt into the text sent to the provider. The core
 * `ImageGenerateParams` (what `provider.generate` consumes) has no negative
 * field, and the image APIs expose no separate negative param — so, exactly
 * like the positive style modifier above, the exclusion is appended to the
 * prompt text. Without this the `negativePrompt` / style `negative_modifier`
 * was persisted on the row but never influenced the generated image.
 */
function applyNegativeToPrompt(prompt: string, negative: string | null): string {
  const trimmed = negative?.trim()
  if (!trimmed) return prompt
  return `${prompt}. Avoid: ${trimmed}.`
}

const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  provider: z.string().optional(),
  parent_id: z.string().optional(),
})

const createGenerationSchema = z.object({
  prompt: z.string().min(1),
  provider: z.string().optional(),
  size: z.string().optional(),
  style: z.string().optional(),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  // Studio generation controls — previously collected + displayed but never sent, so the seed
  // column stayed empty (gallery showed "seed 0") and the provider ignored steps/guidance.
  seed: z.number().int().optional(),
  steps: z.number().int().min(1).max(150).optional(),
  cfg: z.number().min(0).max(30).optional(),
})

const variationSchema = z.object({
  count: z.number().int().min(1).max(8).optional(),
  size: z.string().optional(),
})

const enhancePromptSchema = z.object({ prompt: z.string().min(1) })

/**
 * The UI-facing model IDs are brand names ("Reverie XL v3", "Reverie
 * Flash", "Reverie Print") chosen for marketing polish. The real
 * provider only knows OpenAI/Stability/etc. model IDs. Translate
 * brand → provider so the request OpenAI receives is valid.
 */
function resolveProviderModel(
  brandModel: string | undefined,
  provider: string,
): string | undefined {
  if (!brandModel) return undefined
  // Already a real provider model id — pass through (but route legacy
  // dall-e-* through gpt-image-1 since OpenAI removed the older models).
  if (brandModel.startsWith('gpt-image')) return brandModel
  if (brandModel.startsWith('dall-e')) return 'gpt-image-1'
  if (provider === 'openai') {
    // All brand tiers route through gpt-image-1 — dall-e-3 was removed
    // from the OpenAI Images API ("model 'dall-e-3' does not exist").
    return 'gpt-image-1'
  }
  return undefined
}

/**
 * Run the bonded image-generation provider. On provider failure the DB
 * row is still created with `status='failed'` and the error string is
 * returned so the caller can include it in the API response and the UI
 * can surface it to the user — never silently hide a real provider
 * failure behind a fake-success payload.
 *
 * Providers that return base64 (e.g. gpt-image-1) are normalized to a
 * data: URL so the `<img src>` works without a separate upload step.
 */
/** OpenAI-style generate() params plus the Studio's seed / steps / guidance (CFG) controls. */
interface RunImageParams extends ImageGenerateParams {
  /** Random seed for reproducible generation (the Studio's lockable seed). */
  seed?: number
  /** Number of inference steps. */
  steps?: number
  /** Guidance / CFG scale. */
  guidanceScale?: number
}

async function runImageProvider(params: RunImageParams): Promise<{
  imageUrl: string | null
  revisedPrompt: string | null
  seed: number | null
  status: 'succeeded' | 'failed' | 'queued'
  error: string | null
}> {
  const provider = getImageProvider()
  if (!provider) {
    return {
      imageUrl: null,
      revisedPrompt: null,
      seed: params.seed ?? null,
      status: 'queued',
      error: null,
    }
  }
  try {
    let result: ImageGenerationResult
    // Prefer the Stability-style generateImage() when the bond implements it — it honors the user's
    // seed / steps / guidance (CFG). The default OpenAI bond has only generate(), which can't take
    // them; either way the requested seed is persisted below (reproducibility + gallery display).
    if (
      provider.generateImage &&
      (params.seed != null || params.steps != null || params.guidanceScale != null)
    ) {
      const [w, h] = String(params.size ?? '')
        .split('x')
        .map((n) => Number(n))
      result = await provider.generateImage({
        prompt: params.prompt,
        model: params.model,
        width: Number.isFinite(w) ? w : undefined,
        height: Number.isFinite(h) ? h : undefined,
        seed: params.seed,
        steps: params.steps,
        guidanceScale: params.guidanceScale,
      })
    } else {
      result = await provider.generate({
        prompt: params.prompt,
        model: params.model,
        size: params.size,
        style: params.style,
      })
    }
    const first = result.images?.[0]
    const imageUrl = first?.url ?? (first?.base64 ? `data:image/png;base64,${first.base64}` : null)
    return {
      imageUrl,
      revisedPrompt: first?.revisedPrompt ?? null,
      seed: first?.seed ?? params.seed ?? null,
      status: imageUrl ? 'succeeded' : 'failed',
      error: imageUrl ? null : 'Provider returned no image',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[runImageProvider] provider call failed:', message)
    return {
      imageUrl: null,
      revisedPrompt: null,
      seed: params.seed ?? null,
      status: 'failed',
      error: message,
    }
  }
}

router.post('/', validateBody(createGenerationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }

    const body = req.body as z.infer<typeof createGenerationSchema>
    const provider = body.provider ?? 'openai'
    const size = body.size ?? '1024x1024'
    const style = body.style ?? 'natural'

    // Read the user's active model + style selections so generation
    // honors them. Pure-write state ("activate this preset") that no
    // consumer reads is the failure mode flagship-production-ready.md
    // explicitly calls out.
    const user = await findById<UserActiveSelections>('users', userId)
    const activeModel = user?.oauthData?.activeModel ?? null
    const activeStyleId = user?.oauthData?.activeStyleId ?? null
    const activeStyle = activeStyleId
      ? await findById<StylePresetRow>('style_presets', activeStyleId)
      : null

    // Explicit body.model wins so the Studio's per-call override still
    // works; otherwise fall back to the user's saved active model and
    // finally to the brand default.
    const brandModel = body.model ?? activeModel ?? 'reverie-xl-v3'
    const promptForProvider = applyStyleToPrompt(body.prompt, activeStyle)
    const negativeForProvider = body.negativePrompt ?? activeStyle?.negative_modifier ?? null

    // Atomically RESERVE the credit BEFORE the provider round-trip so concurrent
    // requests can't both pass a stale balance check and overspend (see reserveCredit).
    // Refunded below if the provider fails, so a failed generation still costs nothing.
    const reserve = await reserveCredit(userId, CREDIT_COST_PER_GENERATION, 'generation')
    if (!reserve.ok) {
      return res.status(402).json({
        error: t(
          'generations.insufficientCredits',
          { needed: CREDIT_COST_PER_GENERATION, balance: reserve.balance },
          {
            defaultValue: 'Insufficient credits — need {{needed}}, have {{balance}}.',
          },
        ),
        balance: reserve.balance,
        needed: CREDIT_COST_PER_GENERATION,
      })
    }

    const result = await runImageProvider({
      prompt: applyNegativeToPrompt(promptForProvider, negativeForProvider),
      size,
      style,
      model: resolveProviderModel(brandModel, provider),
      seed: body.seed,
      steps: body.steps,
      guidanceScale: body.cfg,
    })

    const generation = await create('generations', {
      user_id: userId,
      prompt: body.prompt,
      revised_prompt: result.revisedPrompt,
      provider,
      model: brandModel,
      size,
      style,
      style_id: activeStyleId,
      negative_prompt: negativeForProvider,
      // Persist the effective seed (provider-returned if available, else the requested one) so the
      // gallery shows the real seed and the generation is reproducible.
      seed: result.seed,
      image_url: result.imageUrl,
      status: result.status,
      credits_used: result.status === 'succeeded' ? CREDIT_COST_PER_GENERATION : 0,
      completed_at: result.status === 'succeeded' ? new Date() : null,
      is_public: false,
      is_favorite: false,
    })

    // 502 when the upstream provider failed — never paper over a failed generation
    // with a 201. Refund the reservation so a failed generation costs nothing.
    if (result.status === 'failed') {
      await refundCredit(userId, CREDIT_COST_PER_GENERATION, reserve.ledgerId)
      return res.status(502).json({
        ...(generation.data ?? {}),
        error: result.error ?? 'Image generation failed',
      })
    }

    // Succeeded — the reservation IS the debit; link it to the generation for the
    // ledger trail (the read-after-write proof the pricing page isn't selling air).
    const generationId = (generation.data as { id?: string } | null)?.id ?? null
    if (reserve.ledgerId && generationId) {
      await updateById('credit_ledger', reserve.ledgerId, { reference_id: generationId })
    }

    res.status(201).json(generation.data)
  } catch (err) {
    console.error('[generations] POST / failed:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/variations',
  validateParams(idParamSchema),
  validateBody(variationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const original = await findById<Record<string, unknown>>('generations', String(req.params.id))
      if (!original || original.user_id !== userId) {
        return res.status(404).json({
          error: t('generations.notFound', {}, { defaultValue: 'Generation not found' }),
        })
      }

      const body = req.body as z.infer<typeof variationSchema>
      const provider = String(original.provider ?? 'openai')
      const size = body.size ?? String(original.size ?? '1024x1024')
      const style = String(original.style ?? 'natural')
      const prompt = String(original.prompt ?? '')
      const model = String(original.model ?? 'gpt-image-1')
      // Honor the source generation's stored negative prompt on its variations
      // too (baked into the prompt text — see applyNegativeToPrompt).
      const negative = original.negative_prompt ? String(original.negative_prompt) : null

      // Each variation is one full provider round-trip and one credit debit. The client's
      // `count` (the "4 variations" button sends 4) must produce that many variations and cost
      // that many credits — it was ignored, so "4 variations" made 1 image for 1× the price.
      const count = Math.min(8, Math.max(1, Math.floor(Number(body.count ?? 1)) || 1))
      const totalCost = CREDIT_COST_PER_GENERATION * count
      // Reserve the whole batch atomically (see reserveCredit); per-image failures are refunded.
      const reserve = await reserveCredit(userId, totalCost, 'variation')
      if (!reserve.ok) {
        return res.status(402).json({
          error: t(
            'generations.insufficientCredits',
            { needed: totalCost, balance: reserve.balance },
            {
              defaultValue: 'Insufficient credits — need {{needed}}, have {{balance}}.',
            },
          ),
          balance: reserve.balance,
          needed: totalCost,
        })
      }

      const variations: Array<Record<string, unknown>> = []
      let failed = 0
      let firstVariationId: string | null = null
      for (let i = 0; i < count; i++) {
        const result = await runImageProvider({
          prompt: applyNegativeToPrompt(prompt, negative),
          size,
          style,
          model: resolveProviderModel(model, provider),
        })
        const variation = await create('generations', {
          user_id: userId,
          prompt,
          revised_prompt: result.revisedPrompt,
          provider,
          model,
          size,
          style,
          parent_id: original.id,
          image_url: result.imageUrl,
          status: result.status,
          credits_used: result.status === 'succeeded' ? CREDIT_COST_PER_GENERATION : 0,
          completed_at: result.status === 'succeeded' ? new Date() : null,
          is_public: false,
          is_favorite: false,
        })
        const row = (variation.data ?? {}) as Record<string, unknown>
        variations.push(row)
        if (result.status === 'failed') failed += 1
        else if (!firstVariationId) firstVariationId = (row.id as string | undefined) ?? null
      }

      // Refund the reservation for any variation the provider failed to deliver.
      if (failed > 0) {
        await refundCredit(userId, CREDIT_COST_PER_GENERATION * failed, reserve.ledgerId)
      }
      if (failed === count) {
        return res.status(502).json({ variations, error: 'Image variation failed' })
      }
      // Link the batch's single reservation entry to the first delivered variation.
      if (reserve.ledgerId && firstVariationId) {
        await updateById('credit_ledger', reserve.ledgerId, { reference_id: firstVariationId })
      }

      res.status(201).json({ variations })
    } catch (err) {
      console.error('[generations] POST /:id/variations failed:', err)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Drive the bonded chat-style AI provider (Anthropic by default, but
 * any provider that implements `@molecule/api-ai`'s streaming chat
 * interface) to expand a short prompt into a richer one. Returns the
 * full collected text or `null` if the provider stream errors.
 */
async function enhanceWithChatProvider(
  provider: AIProvider,
  prompt: string,
): Promise<string | null> {
  const collected: string[] = []
  try {
    const stream = provider.chat({
      maxTokens: 600,
      temperature: 0.7,
      system:
        'You are an expert prompt engineer for AI image generators. Rewrite the user-supplied prompt so it produces a more striking image. Keep the subject identical; add concrete composition, lighting, lens and material direction. Respond with ONLY the rewritten prompt, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    })
    for await (const event of stream) {
      if (event.type === 'text') collected.push(event.content)
      if (event.type === 'error') return null
    }
  } catch (err) {
    console.error('[enhance-prompt] provider stream failed:', err)
    return null
  }
  const out = collected.join('').trim()
  return out.length > 0 ? out : null
}

router.post(
  '/enhance-prompt',
  validateBody(enhancePromptSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const { prompt } = req.body as z.infer<typeof enhancePromptSchema>
      // Real AI rewrite when an `@molecule/api-ai` provider is bonded
      // (Anthropic, OpenAI chat, etc.). When unbonded — or if the
      // provider stream errors — fall through to the original prompt
      // so the endpoint stays contractually 200 and the studio flow
      // remains testable. The response payload tells the client which
      // path served the answer so the UI can flag "enhanced by AI" vs
      // "no AI configured" honestly.
      const provider = getAIProviderByName('anthropic') ?? getAIProvider() ?? null
      if (!provider) {
        return res.json({ enhancedPrompt: prompt, enhanced: false })
      }
      const enhanced = await enhanceWithChatProvider(provider, prompt)
      if (!enhanced) {
        return res.json({ enhancedPrompt: prompt, enhanced: false })
      }
      res.json({ enhancedPrompt: enhanced, enhanced: true })
    } catch (error) {
      logger.error('generations.enhance', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const {
      page = '1',
      limit = '20',
      provider,
      parent_id,
    } = req.query as Record<string, string | undefined>
    const limitNum = Number(limit) || 20
    const pageNum = Number(page) || 1

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (provider) where.push({ field: 'provider', operator: '=', value: provider })
    if (parent_id) where.push({ field: 'parent_id', operator: '=', value: parent_id })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]

    const generations = await findMany<Record<string, unknown>>('generations', {
      where,
      orderBy,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    })
    res.json(generations)
  } catch (error) {
    logger.error('generations.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const generation = await findById<Record<string, unknown>>('generations', String(req.params.id))
    if (!generation) {
      return res.status(404).json({
        error: t('generations.notFound', {}, { defaultValue: 'Generation not found' }),
      })
    }
    const isOwner = generation.user_id === userId
    const isPublic = generation.is_public === true
    if (!isOwner && !isPublic) {
      return res.status(404).json({
        error: t('generations.notFound', {}, { defaultValue: 'Generation not found' }),
      })
    }
    res.json(generation)
  } catch (error) {
    logger.error('generations.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
