import { Router } from 'express'
import { z } from 'zod'

import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { configure, consume } from '@molecule/api-rate-limit'

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(10).max(5000),
})

configure({ windowMs: 60_000, max: 5 })

const router = Router()

router.post('/', async (req, res) => {
  const rl = await consume(req.ip ?? 'unknown')
  if (!rl.allowed) {
    return res.status(429).json({
      error: t('contact.tooManyRequests', undefined, {
        defaultValue: 'Too many requests. Please try again later.',
      }),
    })
  }
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('contact.invalid', undefined, { defaultValue: 'Please fill in all fields' }),
      issues: parsed.error.issues,
    })
  }

  const to = process.env.CONTACT_TO
  if (!to) {
    return res.status(500).json({
      error: t('contact.misconfigured', undefined, {
        defaultValue: 'Contact form is not configured',
      }),
    })
  }

  await sendMail({
    // EMAIL_FROM is the canonical sender var. The default DERIVES from MAILGUN_DOMAIN —
    // Mailgun rejects a `from` whose domain isn't your verified sending domain, so a
    // hardcoded `noreply@example.com` bounces once MAILGUN_DOMAIN is your real domain.
    from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
    to,
    replyTo: parsed.data.email,
    subject: `Contact form: ${parsed.data.name}`,
    text: parsed.data.message,
  })
  res.json({ ok: true })
})

export default router
