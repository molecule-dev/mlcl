import { Router } from 'express'
import { z } from 'zod'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { sendSms } from '../lib/send-sms.js'

const router = Router()

const notifySchema = z.object({
  message: z.string().min(1).max(1000),
})

/**
 * `POST /notify-me { message }` — text the SIGNED-IN user their own message.
 *
 * The recipient number is looked up from the user's OWN record server-side; it
 * is NEVER taken from the request body. That is the whole security model: if a
 * caller could pass an arbitrary `to`, you'd have an open SMS relay (spam + your
 * money). Extend this pattern — not the anti-pattern — for reminders/alerts:
 * always resolve the number from a record you own + authorize.
 *
 * NOTE: the framework `users` table has no `phone` column by default. Add a
 * `phone` (E.164) column — and, for a real product, a `phone_verified` flag set
 * only after an OTP round-trip (see `@molecule/api-two-factor`) — and only text
 * verified numbers.
 */
router.post('/notify-me', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('sms.unauthorized', undefined, { defaultValue: 'You must be logged in.' }) })
  }

  const parsed = notifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('sms.invalidMessage', undefined, { defaultValue: 'A message is required.' }),
    })
  }

  const user = await findById<{ phone?: string; phone_verified?: boolean }>('users', userId)
  const to = user?.phone
  if (!to) {
    return res.status(400).json({
      error: t('sms.noPhone', undefined, {
        defaultValue: 'Add and verify a mobile number before enabling SMS alerts.',
      }),
    })
  }
  // Only text a VERIFIED number — an unverified one may belong to someone else
  // (typo / takeover). Remove this guard only if you have no verification flow.
  if (user?.phone_verified === false) {
    return res.status(400).json({
      error: t('sms.phoneUnverified', undefined, {
        defaultValue: 'Verify your mobile number before enabling SMS alerts.',
      }),
    })
  }

  const result = await sendSms(to, parsed.data.message)
  if (!result.ok) {
    return res.status(502).json({ error: result.error })
  }
  return res.json({ id: result.id })
})

export default router
