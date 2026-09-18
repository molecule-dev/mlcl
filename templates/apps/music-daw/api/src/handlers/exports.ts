import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { MusicDawLimits } from '../tiers.js'

const router = Router()

const ALLOWED_FORMATS = ['wav', 'mp3', 'flac', 'stems'] as const
const ALLOWED_QUALITY = ['low', 'medium', 'high'] as const

const createExportSchema = z.object({
  project_id: z.string().uuid(),
  format: z.enum(ALLOWED_FORMATS).default('wav'),
  quality: z.enum(ALLOWED_QUALITY).default('high'),
  sample_rate: z.number().int().positive().default(44100),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (projectId) where.push({ field: 'project_id', operator: '=', value: projectId })

    const exports = await findMany('audio_exports', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(exports)
  } catch (error) {
    logger.error('exports.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('audio_exports', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('exports.notFound', undefined, { defaultValue: 'Export not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('exports.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier export cap (tiers.ts maxExports) — defined + shown on Pricing but never
// enforced, unlike the sibling project/track/effect/instrument limits.
const enforceExportLimit = enforceLimit<MusicDawLimits>({
  limitType: 'maxExports',
  getLimit: (limits) => limits.maxExports,
  getCurrent: async (userId) =>
    count('audio_exports', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceExportLimit,
  validateBody(createExportSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const body = req.body as z.infer<typeof createExportSchema>
      const project = await findById<Record<string, unknown>>('music_projects', body.project_id)
      if (!project || project.user_id !== userId) {
        return res.status(404).json({
          error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
        })
      }

      // Audio mixing/playback is browser-only — the server-side audio render
      // bond is a Phase-1 candidate (see packages-proposed/api-audio-render.md).
      // For now we record the request with status=done so the UI can poll for
      // completion deterministically; an actual `output_url` is filled in once
      // the render bond is wired up.
      const result = await create('audio_exports', {
        project_id: body.project_id,
        user_id: userId,
        format: body.format,
        quality: body.quality,
        sample_rate: body.sample_rate,
        status: 'done',
        output_url: null,
        created_at: new Date(),
      })

      const created = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(created)
    } catch (error) {
      logger.error('exports.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('audio_exports', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('exports.notFound', undefined, { defaultValue: 'Export not found.' }),
      })
    }

    await deleteById('audio_exports', id)
    res.status(204).end()
  } catch (error) {
    logger.error('exports.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
