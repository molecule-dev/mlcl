/**
 * Hosts handler — public profile + listings lookups.
 *
 * GET /hosts/:id           — public host profile (id-scoped find by user_id)
 * GET /hosts/:id/listings  — public listings owned by a host
 *
 * Hosts are users; the auth on `users.read` is enforced upstream by
 * `@molecule/api-resource-user`'s `authSelf` for self-mutation. These
 * read-only endpoints are public so guest pages can render host cards.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

import { decorateListings } from './_decorate.js'

const router = Router()

const listListingsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['active', 'paused', 'archived']).optional().default('active'),
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const host = await findById<Record<string, unknown>>('users', id)
    if (!host) {
      return res
        .status(404)
        .json({ error: t('host.notFound', {}, { defaultValue: 'Host not found' }) })
    }
    // SECURITY: build the public profile from an explicit ALLOW-LIST of
    // non-sensitive columns. A deny-list spread (`...safe`) on the `users`
    // row leaks every column the deny-list forgot — and the users schema has
    // NO `password`/`password_hash`/`email_verification_token` columns at all,
    // so the old deny-list removed nothing and exposed `email`, `oauthServer`,
    // `oauthId`, `oauthData`, `planKey`, `planExpiresAt`, `planAutoRenews`,
    // `twoFactorEnabled` on an unauthenticated, id-addressed read. NEVER add
    // sensitive fields here; if contact info must ever be exposed, gate it
    // behind a relationship check (active booking/thread between
    // res.locals.session.userId and this host).
    const { id: hostId, name, username, avatar, bio } = host as Record<string, unknown>

    // Aggregate the host's listings so the public profile can render
    // trip/review stats without the client doing a second pass.
    const listings = await findMany<Record<string, unknown>>('listings', {
      where: [{ field: 'host_id', operator: '=', value: id }],
      limit: 200,
    })
    let tripsHosted = 0
    let reviewsReceived = 0
    let weightedRatingTotal = 0
    let activeListings = 0
    const memberSince: string | null = host.createdAt
      ? new Date(String(host.createdAt)).toISOString()
      : null
    for (const l of listings) {
      const totalBookings = Number(l.total_bookings ?? 0)
      const reviewsCount = Number(l.reviews_count ?? 0)
      const rating = Number(l.rating ?? 0)
      tripsHosted += totalBookings
      reviewsReceived += reviewsCount
      weightedRatingTotal += rating * Math.max(1, reviewsCount)
      if (l.status === 'active') activeListings++
    }
    const averageRating =
      reviewsReceived > 0
        ? weightedRatingTotal /
          Math.max(
            1,
            listings.reduce((acc, l) => acc + Math.max(1, Number(l.reviews_count ?? 0)), 0),
          )
        : 0
    const isSuperhost = averageRating >= 4.85 && reviewsReceived >= 50

    const profile = {
      id: hostId ?? id,
      name,
      username,
      avatar,
      bio,
      member_since: memberSince,
      stats: {
        active_listings: activeListings,
        trips_hosted: tripsHosted,
        reviews_received: reviewsReceived,
        average_rating: Math.round(averageRating * 100) / 100,
      },
      is_superhost: isSuperhost,
      photo: `https://picsum.photos/seed/roost-host-${id.slice(-12)}/400/400`,
    }
    res.json(profile)
  } catch (error) {
    logger.error('hosts.getProfile', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/:id/listings',
  validateQuery(listListingsQuery),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id)
      const { page, limit, status } = req.query as unknown as z.infer<typeof listListingsQuery>
      const where: WhereCondition[] = [
        { field: 'host_id', operator: '=', value: id },
        { field: 'status', operator: '=', value: status },
      ]
      const [rows, total] = await Promise.all([
        findMany<Record<string, unknown>>('listings', {
          where,
          orderBy: [{ field: 'created_at', direction: 'desc' }],
          limit,
          offset: (page - 1) * limit,
        }),
        count('listings', where),
      ])
      const data = await decorateListings(rows)
      res.json({ data, total, page, limit })
    } catch (error) {
      logger.error('hosts.getListings', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
