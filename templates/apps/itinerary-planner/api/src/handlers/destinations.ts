import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

/**
 * Curated destinations are seeded into the `destinations` table by the
 * 0010_itinerary_planner_tables.sql migration (editorial seed rows). This
 * route serves them read-only — destinations are editorial content,
 * not user-owned, so there's no auth scoping or POST/PUT here.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await findMany('destinations', {
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('GET /destinations failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
