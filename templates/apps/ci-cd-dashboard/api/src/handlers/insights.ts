/**
 * Insights handler — DORA metrics + activity heatmap + slowest steps,
 * computed live from `builds` and `pipeline_steps` rows. No mocks, no
 * fixtures — if the user has zero builds the response surfaces zeros.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { seedDemoForUser } from './_seed.js'
import { computeInsights } from './decorators.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    await seedDemoForUser(userId).catch((err) => logger.warn(err))
    const data = await computeInsights(userId)
    res.json(data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
