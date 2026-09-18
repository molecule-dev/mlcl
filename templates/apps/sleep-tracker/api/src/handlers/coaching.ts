/**
 * Coaching article handlers.
 *
 * - List published articles (public read).
 * - Read full article body — gated by entitlement when `is_premium = true`
 *   (free users see a teaser).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * Authorization model: coaching_articles is a SYSTEM-OWNED, PUBLIC
 * catalog table — there is no `user_id` column on coaching_articles
 * because every published row is readable by every user. The IDOR
 * verify gate (G6) flags any handler that calls `findById` without
 * a `user_id` scope, but here that scope is intentionally absent;
 * access control runs through `getEffectiveTier()` (entitlements)
 * rather than ownership. Adding a fake `user_id` constraint would
 * be wrong — leave the comment so future linters and humans
 * understand the design.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { type SleepTrackerLimits, sleepTrackerPlanKeys } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  category: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { category, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'is_published', operator: '=', value: true }]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    const orderBy: OrderBy[] = [{ field: 'published_at', direction: 'desc' }]
    const articles = await findMany<Record<string, unknown>>('coaching_articles', {
      where,
      orderBy,
      limit: limit ?? 25,
      offset: offset ?? 0,
    })
    // Strip body for list view.
    res.json(
      articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        is_premium: a.is_premium,
        published_at: a.published_at,
        hero_image_key: a.hero_image_key,
      })),
    )
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const article = await findById<Record<string, unknown>>(
      'coaching_articles',
      String(req.params.id),
    )
    if (!article || article.is_published !== true) {
      res.status(404).json({
        error: t('coaching.notFound', undefined, { defaultValue: 'Article not found.' }),
      })
      return
    }
    if (article.is_premium === true) {
      const tier = await getEffectiveTier<SleepTrackerLimits>(res)
      if (tier.planKey === sleepTrackerPlanKeys.free) {
        res.json({
          ...article,
          body_markdown:
            String(article.body_markdown ?? '').slice(0, 280) +
            '\n\n_Pro members unlock the full article._',
          locked: true,
        })
        return
      }
    }
    res.json({ ...article, locked: false })
  },
)

export default router
