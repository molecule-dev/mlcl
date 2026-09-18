import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

const pipelineQuerySchema = z.object({
  owner_id: z.string().uuid().optional(),
})

interface Deal {
  id: string
  title: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
}

router.get('/', validateQuery(pipelineQuerySchema), async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    // Pipeline is always scoped to the authenticated user — query-string
    // owner_id overrides are intentionally ignored to avoid IDOR.
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]

    const deals = await findMany<Deal>('deals', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })

    const pipeline = STAGES.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage)
      return {
        stage,
        label: t(`pipeline.stage.${stage}`, {}, { defaultValue: stage.replace('_', ' ') }),
        deals: stageDeals,
        total: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
        count: stageDeals.length,
      }
    })

    res.json(pipeline)
  } catch (error) {
    console.error(`[crm] pipeline.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const deals = await findMany<Deal>('deals', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const openDeals = deals.filter((d) => !d.stage.startsWith('closed_'))
    const wonDeals = deals.filter((d) => d.stage === 'closed_won')

    res.json({
      total_open: openDeals.length,
      total_value: openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
      won_count: wonDeals.length,
      won_value: wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
    })
  } catch (error) {
    console.error(`[crm] pipeline.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
