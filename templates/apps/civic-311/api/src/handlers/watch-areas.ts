import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { deriveAddress } from '../lib/geo.js'
import type { CivicLimits } from '../tiers.js'

const router = Router()

// Saved watch areas are strictly owner-scoped: name + center pin + radius
// (in city-grid blocks). New issues whose pin falls inside one of a user's
// areas fan out an in-app notification (see handlers/issues.ts POST /).
// Every endpoint here requires an authenticated session; non-owner ids 404
// so area existence isn't probeable.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

function notFound(res: Response): Response {
  return res
    .status(404)
    .json({ error: t('watchAreas.notFound', {}, { defaultValue: 'Watch area not found' }) })
}

const createAreaSchema = z.object({
  name: z.string().min(1).max(100),
  x: z.coerce.number().min(0).max(99.99),
  y: z.coerce.number().min(0).max(99.99),
  radius: z.coerce.number().min(1).max(40),
})

interface AreaRow {
  id: string
  user_id: string
  name: string
  x: number
  y: number
  radius: number
  created_at: string
}

// ---------------------------------------------------------------------------
// GET / — List the caller's watch areas (with derived center address)
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)

    const areas = (await findMany('watch_areas', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as unknown as AreaRow[]

    res.json(areas.map((a) => ({ ...a, derived_address: deriveAddress(a.x, a.y) })))
  } catch (err) {
    console.error('watch_area.list', err)
    res.status(500).json({
      error: t('watchAreas.listFailed', {}, { defaultValue: 'Failed to list watch areas' }),
    })
  }
})

// ---------------------------------------------------------------------------
// POST / — Save a watch area
// ---------------------------------------------------------------------------

router.post(
  '/',
  enforceLimit<CivicLimits>({
    limitType: 'maxWatchAreas',
    getLimit: (limits) => limits.maxWatchAreas,
    getCurrent: async (userId) =>
      count('watch_areas', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAreaSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId
      const { name, x, y, radius } = req.body

      const result = await create('watch_areas', {
        user_id: userId,
        name,
        x,
        y,
        radius,
        created_at: new Date().toISOString(),
      })
      const area = (result.data ?? result) as unknown as AreaRow
      res.status(201).json({ ...area, derived_address: deriveAddress(area.x, area.y) })
    } catch (err) {
      console.error('watch_area.create', err)
      res.status(500).json({
        error: t('watchAreas.createFailed', {}, { defaultValue: 'Failed to save watch area' }),
      })
    }
  },
)

// ---------------------------------------------------------------------------
// DELETE /:id — Remove one of the caller's watch areas
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const area = (await findById('watch_areas', id)) as AreaRow | null
    if (!area || area.user_id !== userId) return notFound(res)

    await deleteById('watch_areas', id)
    res.status(204).send()
  } catch (err) {
    console.error('watch_area.delete', err)
    res.status(500).json({
      error: t('watchAreas.deleteFailed', {}, { defaultValue: 'Failed to delete watch area' }),
    })
  }
})

export default router
