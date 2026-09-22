/**
 * health-records — dashboard stats summary.
 *
 * Returns aggregate counts for the dashboard hero. On first call from a
 * given user, ensures the demo seed has been planted so the dashboard
 * lands on populated data immediately after signup.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { seedDemoForUser } from './_seed.js'

const router = Router()

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)

    const [
      activeConditions,
      activeMedications,
      activeAllergies,
      recentLabs,
      upcomingImmunizations,
    ] = await Promise.all([
      count('conditions', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ]),
      count('medications', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_active', operator: '=', value: true },
      ]),
      count('allergies', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_active', operator: '=', value: true },
      ]),
      count('lab_results', [{ field: 'user_id', operator: '=', value: userId }]),
      count('immunizations', [{ field: 'user_id', operator: '=', value: userId }]),
    ])

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
    const labsRecent = await findMany<{ flag?: string; collected_date?: string | Date }>(
      'lab_results',
      {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'created_at', operator: '>=', value: ninetyDaysAgo },
        ],
        orderBy: [{ field: 'collected_date', direction: 'desc' }],
      },
    )
    const abnormalCount = labsRecent.filter((l) => l.flag && l.flag !== 'normal').length

    res.json({
      active_conditions: activeConditions,
      active_medications: activeMedications,
      active_allergies: activeAllergies,
      recent_labs: recentLabs,
      recent_labs_abnormal: abnormalCount,
      upcoming_immunizations: upcomingImmunizations,
    })
  } catch (err) {
    logger.error('stats.overview', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
