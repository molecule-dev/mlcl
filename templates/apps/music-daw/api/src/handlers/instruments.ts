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

const ALLOWED_CATEGORIES = ['synth', 'drum', 'sampler', 'keys', 'pad', 'lead', 'bass'] as const

const createInstrumentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(ALLOWED_CATEGORIES).default('synth'),
  type: z.string().min(1).default('oscillator'),
  settings: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    // The instruments table mixes built-in library presets (NULL user_id,
    // readable by everyone authenticated) with user-owned presets. Every
    // authed user sees the union of "library + own".
    const all = (await findMany('instruments', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })) as Array<Record<string, unknown>>
    const visible = all.filter((row) => row.user_id == null || row.user_id === userId)
    res.json(visible)
  } catch (error) {
    logger.error('instruments.list', error)
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
    const row = await findById<Record<string, unknown>>('instruments', id)
    if (!row) {
      return res.status(404).json({
        error: t('instruments.notFound', undefined, { defaultValue: 'Instrument not found.' }),
      })
    }
    // Library rows (user_id IS NULL) are public to authed users; user-owned
    // rows are scoped to the owner.
    if (row.user_id != null && row.user_id !== userId) {
      return res.status(404).json({
        error: t('instruments.notFound', undefined, { defaultValue: 'Instrument not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('instruments.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier instrument cap (tiers.ts maxInstruments) — defined + shown on Pricing but never
// enforced.
const enforceInstrumentLimit = enforceLimit<MusicDawLimits>({
  limitType: 'maxInstruments',
  getLimit: (limits) => limits.maxInstruments,
  getCurrent: async (userId) =>
    count('instruments', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceInstrumentLimit,
  validateBody(createInstrumentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const body = req.body as z.infer<typeof createInstrumentSchema>
      const result = await create('instruments', {
        user_id: userId,
        name: body.name,
        category: body.category,
        type: body.type,
        settings: JSON.stringify(body.settings ?? {}),
        created_at: new Date(),
      })

      const created = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(created)
    } catch (error) {
      logger.error('instruments.create', error)
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
    const existing = await findById<Record<string, unknown>>('instruments', id)
    // Only owner-presets are deletable; library rows (NULL user_id) are
    // immutable from the API.
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('instruments.notFound', undefined, { defaultValue: 'Instrument not found.' }),
      })
    }

    await deleteById('instruments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('instruments.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
