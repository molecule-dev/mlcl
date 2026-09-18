import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { MusicDawLimits } from '../tiers.js'

const router = Router()

const ALLOWED_TYPES = [
  'reverb',
  'delay',
  'eq',
  'compressor',
  'distortion',
  'chorus',
  'filter',
] as const

const createEffectSchema = z.object({
  track_id: z.string().uuid(),
  type: z.enum(ALLOWED_TYPES).default('reverb'),
  parameters: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().nonnegative().optional(),
})

const updateEffectSchema = z.object({
  type: z.enum(ALLOWED_TYPES).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const trackId = typeof req.query.track_id === 'string' ? req.query.track_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (trackId) where.push({ field: 'track_id', operator: '=', value: trackId })

    const effects = await findMany('audio_effects', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(effects)
  } catch (error) {
    logger.error('effects.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier effect cap (tiers.ts maxEffects) — defined + shown on Pricing but never enforced.
const enforceEffectLimit = enforceLimit<MusicDawLimits>({
  limitType: 'maxEffects',
  getLimit: (limits) => limits.maxEffects,
  getCurrent: async (userId) =>
    count('audio_effects', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceEffectLimit,
  validateBody(createEffectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const body = req.body as z.infer<typeof createEffectSchema>

      const track = await findById<Record<string, unknown>>('audio_tracks', body.track_id)
      if (!track || track.user_id !== userId) {
        return res.status(404).json({
          error: t('tracks.notFound', undefined, { defaultValue: 'Track not found.' }),
        })
      }

      const result = await create('audio_effects', {
        track_id: body.track_id,
        user_id: userId,
        type: body.type,
        parameters: JSON.stringify(body.parameters ?? {}),
        enabled: true,
        position: body.position ?? 0,
        created_at: new Date(),
      })

      const created = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(created)
    } catch (error) {
      logger.error('effects.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateEffectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('audio_effects', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('effects.notFound', undefined, { defaultValue: 'Effect not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateEffectSchema>
    const updates: Record<string, unknown> = {}
    if (body.type !== undefined) updates.type = body.type
    if (body.parameters !== undefined) updates.parameters = JSON.stringify(body.parameters)
    if (body.enabled !== undefined) updates.enabled = body.enabled
    if (body.position !== undefined) updates.position = body.position

    const result = await updateById('audio_effects', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('effects.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('audio_effects', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('effects.notFound', undefined, { defaultValue: 'Effect not found.' }),
      })
    }

    await deleteById('audio_effects', id)
    res.status(204).end()
  } catch (error) {
    logger.error('effects.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
