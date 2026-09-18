import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getClient } from '@molecule/api-payments-stripe'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.post('/portal', requireAuth, async (_req, res) => {
  const user = (await findById('users', res.locals.session.userId as string)) as {
    id: string
    stripe_customer_id?: string
  } | null
  if (!user?.stripe_customer_id) {
    return res.status(400).json({
      error: t('billing.noCustomer', undefined, { defaultValue: 'No billing account on file' }),
    })
  }
  // Stripe requires an ABSOLUTE return_url — a bare `/account` is rejected. SITE_ORIGIN
  // is the app's public origin (same var the framework's transactional emails use).
  const returnUrl = `${process.env.SITE_ORIGIN || 'http://localhost:3000'}/account`
  const session = await getClient().billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: returnUrl,
  })
  res.json({ url: session.url })
})

export default router
