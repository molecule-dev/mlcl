/**
 * Newsletter subscription handler.
 *
 * The footer on storefront/category/search pages has a Join button next to
 * an email input. Persist these rows so future scheduled jobs can fan out
 * a real email broadcast.
 */
import { Router } from 'express'
import { z } from 'zod'

import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const subscribeSchema = z.object({
  email: z.string().email(),
})

const router = Router()

router.post('/', validateBody(subscribeSchema), async (req, res) => {
  try {
    const { email } = req.body as { email: string }
    const lowered = email.trim().toLowerCase()

    // Constant-shape response: a fresh signup and an already-subscribed
    // address return the same status + body. Diverging on "already existed"
    // (or leaking the row id) turns the footer form into a subscriber
    // enumeration oracle.
    const existing = await findMany<Record<string, unknown>>('newsletter_subscriptions', {
      where: [{ field: 'email', operator: '=', value: lowered }],
      limit: 1,
    })
    if (existing.length === 0) {
      await create<Record<string, unknown>>('newsletter_subscriptions', {
        email: lowered,
        created_at: new Date().toISOString(),
      })
    }

    // TODO: per-IP rate limit for this route. The rate-limit bond
    // (setupRateLimitMemory in bonds/index.ts) throttles only the user
    // resource's auth routes today; there is no per-handler limiter house
    // pattern in the template fleet yet, so add one here when one exists.
    res.status(201).json({ subscribed: true })
  } catch (error) {
    logger.error('newsletter.subscribe', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
