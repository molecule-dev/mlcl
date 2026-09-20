import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'

import { buildLookups, type DecoratedShift } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

/**
 * Open shifts = published shifts with no assignee. This is the staff-facing
 * marketplace list; claiming lives in claims.ts (POST /api/claims) so the
 * claim lifecycle (pending → manager approval) gets its own surface.
 */
router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const lookups = await buildLookups(userId)
  const items: DecoratedShift[] = lookups.rawShifts
    .filter((s) => s.staff_id == null && s.published)
    .map(lookups.decorateShiftWithAvailability)
  res.json(items)
})

export default router
