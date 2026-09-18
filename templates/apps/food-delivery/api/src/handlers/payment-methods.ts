/**
 * Saved payment methods (cards on file).
 *
 * Card-on-file lifecycle:
 *   POST /api/payment-methods/setup-session  → returns Stripe Checkout URL in setup mode
 *   GET  /api/payment-methods                → list saved cards (most recent first)
 *   POST /api/payment-methods/:id/default    → set as default
 *   DELETE /api/payment-methods/:id          → remove (also detaches in Stripe)
 *
 * The frontend opens the Checkout setup session, the user enters a card,
 * Stripe redirects back to /settings?payment_setup=success which calls the
 * sync endpoint to materialize the saved method into our DB.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface PaymentMethodRow {
  id: string
  user_id: string
  stripe_payment_method_id: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
  is_default: boolean
  created_at: Date | string
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rows = (await findMany<PaymentMethodRow>('payment_methods', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [
      { field: 'is_default', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ],
    limit: 25,
  })) as PaymentMethodRow[]
  res.json({ data: rows })
})

router.post('/setup-session', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({
      error: t('payments.notConfigured', undefined, {
        defaultValue: 'Payments are not configured.',
      }),
    })
    return
  }

  // Use Stripe directly: api-payments has no setup-mode helper exposed.
  const StripeMod = await import('stripe').catch(() => null)
  if (!StripeMod) {
    res.status(503).json({
      error: t('payments.notConfigured', undefined, {
        defaultValue: 'Payments are not configured.',
      }),
    })
    return
  }
  const Stripe = StripeMod.default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const origin =
    (req.headers.origin as string | undefined) ?? `http://localhost:${process.env.PORT ?? '4000'}`
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${origin}/settings?payment_setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?payment_setup=cancelled`,
      metadata: { userId },
      client_reference_id: userId,
    })
    res.json({ url: session.url, id: session.id })
  } catch (err) {
    logger.error?.(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Sync a successful Stripe Checkout setup session into our DB.
 * Called by the frontend on /settings?payment_setup=success.
 */
router.post('/sync', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({
      error: t('payments.notConfigured', undefined, {
        defaultValue: 'Payments are not configured.',
      }),
    })
    return
  }
  const sessionId = (req.body as { session_id?: string }).session_id
  if (!sessionId) {
    res
      .status(400)
      .json({ error: t('common.badRequest', undefined, { defaultValue: 'Missing session_id.' }) })
    return
  }
  const StripeMod = await import('stripe').catch(() => null)
  if (!StripeMod) {
    res.status(503).json({
      error: t('payments.notConfigured', undefined, {
        defaultValue: 'Payments are not configured.',
      }),
    })
    return
  }
  const Stripe = StripeMod.default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['setup_intent'] })
    if (session.client_reference_id !== userId) {
      res
        .status(403)
        .json({ error: t('common.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const setupIntentId =
      typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
    if (!setupIntentId) {
      res.status(400).json({ error: 'No setup intent attached to session.' })
      return
    }
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    })
    const pm = setupIntent.payment_method
    const pmId = typeof pm === 'string' ? pm : pm?.id
    if (!pmId) {
      res.status(400).json({ error: 'Setup intent has no payment method.' })
      return
    }
    const paymentMethod =
      typeof pm === 'object' && pm ? pm : await stripe.paymentMethods.retrieve(pmId)

    // Upsert: don't duplicate if same Stripe PM id is already saved.
    const existing = (await findMany<PaymentMethodRow>('payment_methods', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'stripe_payment_method_id', operator: '=', value: pmId },
      ],
      limit: 1,
    })) as PaymentMethodRow[]
    if (existing.length > 0) {
      res.json({ data: existing[0], existing: true })
      return
    }

    // First saved card becomes default.
    const allForUser = (await findMany<PaymentMethodRow>('payment_methods', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })) as PaymentMethodRow[]
    const isDefault = allForUser.length === 0

    const result = await create('payment_methods', {
      user_id: userId,
      stripe_payment_method_id: pmId,
      brand: paymentMethod.card?.brand ?? null,
      last4: paymentMethod.card?.last4 ?? null,
      exp_month: paymentMethod.card?.exp_month ?? null,
      exp_year: paymentMethod.card?.exp_year ?? null,
      is_default: isDefault,
    })
    res.status(201).json(result.data ?? result)
  } catch (err) {
    logger.error?.(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/default', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const existing = await findById<PaymentMethodRow>('payment_methods', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  const peers = (await findMany<PaymentMethodRow>('payment_methods', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_default', operator: '=', value: true },
    ],
    limit: 50,
  })) as PaymentMethodRow[]
  for (const row of peers) {
    if (String(row.id) !== id) {
      await updateById('payment_methods', String(row.id), { is_default: false })
    }
  }
  await updateById('payment_methods', id, { is_default: true })
  res.json({ id, is_default: true })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const existing = await findById<PaymentMethodRow>('payment_methods', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  // Best-effort detach in Stripe.
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const StripeMod = await import('stripe')
      const stripe = new StripeMod.default(process.env.STRIPE_SECRET_KEY)
      await stripe.paymentMethods.detach(existing.stripe_payment_method_id)
    } catch (err) {
      logger.warn?.(`stripe detach failed: ${(err as Error).message}`)
    }
  }
  await deleteById('payment_methods', id)
  res.json({ removed: true })
})

export default router
