/**
 * Credits handler — exposes a user's running credit balance, the plan
 * they're on (so the dashboard hero can show real plan name + monthly
 * cap instead of a hardcoded "Creator / 4000" placeholder), and the
 * dashboard KPIs derived from `public.credit_ledger` and
 * `public.generations`.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface UserPlanRow {
  id: string
  planKey?: string | null
  planExpiresAt?: Date | string | null
  createdAt?: Date | string | null
}

interface PlanCatalogEntry {
  id: string
  name: string
  creditsPerMonth: number
}

/**
 * Plan catalogue mirrored from `handlers/plans.ts`. Kept in sync by
 * convention — both handlers describe the same product. Storing it
 * twice avoids a circular import; the alternative (export from
 * `plans.ts`) drags Stripe into the credits handler's import graph for
 * no reason.
 */
const PLAN_CATALOG: Record<string, PlanCatalogEntry> = {
  starter: { id: 'starter', name: 'Starter', creditsPerMonth: 120 },
  creator: { id: 'creator', name: 'Creator', creditsPerMonth: 4_000 },
  studio: { id: 'studio', name: 'Studio', creditsPerMonth: 20_000 },
}

const DEFAULT_PLAN_ID = 'starter'

/**
 * Compute "credits renew on" from the user's plan + signup date. Free
 * (starter) tier: there is no recurring grant, so renewsOn is null
 * (the dashboard hides the line). Paid tiers: anchor to signup
 * day-of-month, advance by one month from the most recent past
 * occurrence.
 *
 * This matches the contract a paying customer expects: a real
 * recurring date they can put on the calendar, not a hardcoded
 * "May 21" placeholder copied from the design comp.
 */
function computeRenewsOn(planId: string, signupAt: Date | null): string | null {
  if (planId === 'starter' || planId === DEFAULT_PLAN_ID) return null
  if (!signupAt || Number.isNaN(signupAt.valueOf())) return null
  const anchorDay = signupAt.getUTCDate()
  const now = new Date()
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay))
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1)
  }
  return candidate.toISOString().slice(0, 10)
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const balanceResult = await query<{ balance: number | null }>(
      `SELECT COALESCE(SUM(delta), 0)::int AS balance FROM credit_ledger WHERE user_id = $1`,
      [userId],
    )
    const user = await findById<UserPlanRow>('users', userId)
    const planId = user?.planKey ?? DEFAULT_PLAN_ID
    const plan = PLAN_CATALOG[planId] ?? PLAN_CATALOG[DEFAULT_PLAN_ID]
    const signupAt = user?.createdAt
      ? user.createdAt instanceof Date
        ? user.createdAt
        : new Date(user.createdAt)
      : null
    res.json({
      balance: balanceResult.rows[0]?.balance ?? 0,
      plan: {
        id: plan.id,
        name: plan.name,
        creditsPerMonth: plan.creditsPerMonth,
      },
      renewsOn: computeRenewsOn(plan.id, signupAt),
    })
  } catch (error) {
    logger.error('credits.get', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/kpis', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const todayResult = await query<{ count: number | null }>(
      `SELECT COUNT(*)::int AS count
         FROM generations
        WHERE user_id = $1
          AND created_at::date = CURRENT_DATE`,
      [userId],
    )
    const queueResult = await query<{ count: number | null }>(
      `SELECT COUNT(*)::int AS count
         FROM generations
        WHERE user_id = $1
          AND status IN ('queued','generating')`,
      [userId],
    )
    const upscaledResult = await query<{ count: number | null }>(
      `SELECT COUNT(*)::int AS count
         FROM generations
        WHERE user_id = $1
          AND status = 'upscaled'
          AND created_at >= now() - interval '7 days'`,
      [userId],
    )
    const sharedResult = await query<{ count: number | null }>(
      `SELECT COUNT(*)::int AS count
         FROM collections
        WHERE user_id = $1
          AND is_public = true`,
      [userId],
    )
    res.json({
      generatedToday: todayResult.rows[0]?.count ?? 0,
      inQueue: queueResult.rows[0]?.count ?? 0,
      upscaledThisWeek: upscaledResult.rows[0]?.count ?? 0,
      sharedCollections: sharedResult.rows[0]?.count ?? 0,
    })
  } catch (error) {
    logger.error('credits.kpis', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
