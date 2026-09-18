import { Router } from 'express'
import { z } from 'zod'

import { get } from '@molecule/api-bond'
import { requireUser } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import type { PaymentProvider } from '@molecule/api-payments'

import { boxIncludedItems } from '../lib/box-items.js'
import { wrap } from './_async.js'

const router = Router()

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  preferences: z.record(z.string(), z.unknown()).optional().default({}),
})

const preferencesSchema = z.object({
  preferences: z.record(z.string(), z.unknown()).default({}),
})

const cancelSchema = z.object({
  reason: z.string().optional(),
})

export const nextBillingDate = (interval: string, intervalCount = 1): string => {
  const days = interval === 'year' ? 365 : interval === 'quarter' ? 91 : 30
  // Honor the plan's interval_count — a plan billed "every 2 months" (which the dashboard
  // advertises as `Every {interval_count} {interval}`) must schedule the next box 2 intervals
  // out, not 1. Without this the count was inert and every plan billed one interval out.
  const count = Math.max(1, Math.floor(Number(intervalCount)) || 1)
  return new Date(Date.now() + days * count * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Auto-create a "pending" box for a freshly-active subscription so the
 * dashboard's `boxes/mine/upcoming` query has something real to show. The box
 * is seeded with the plan's default included items as `box_items` rows so the
 * customize page has rows to render and toggle.
 *
 * Called at subscribe time AND at resume time. Idempotent: skips if there is
 * already a non-shipped box for this user.
 */
const ensurePendingBox = async (
  userId: string,
  subscriptionId: string,
  plan: Record<string, unknown>,
): Promise<void> => {
  const existing = await findOne<Record<string, unknown>>('boxes', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: 'in', value: ['pending', 'customizing', 'ready'] },
  ])
  if (existing) return

  // Honor the subscriber's item swaps (Customize → preferences.excludedItems): the box ships the
  // plan's items minus the ones they skipped. This path used to build box_items straight from
  // plan.included_items, so a skipped item still shipped.
  const subscription = await findById<Record<string, unknown>>('subscriptions', subscriptionId)
  const includedItems = boxIncludedItems(plan.included_items, subscription?.preferences)
  const interval = (plan.interval as string) ?? 'month'
  const intervalCount = Number(plan.interval_count ?? 1)

  const boxResult = await create('boxes', {
    user_id: userId,
    subscription_id: subscriptionId,
    theme: plan.name as string,
    billing_period: interval,
    scheduled_for: nextBillingDate(interval, intervalCount),
    status: 'pending',
    customizations: JSON.stringify({}),
    items: JSON.stringify(includedItems),
  })
  const box = (boxResult.data ?? boxResult) as Record<string, unknown>

  for (const itemName of includedItems) {
    await create('box_items', {
      box_id: box.id,
      name: itemName,
      quantity: 1,
      is_custom: false,
    })
  }
}

router.get(
  '/mine',
  wrap(async (_req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const subs = await findMany<Record<string, unknown>>('subscriptions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: 'in', value: ['active', 'paused'] },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1,
    })

    if (!subs.length) {
      res.json(null)
      return
    }
    const sub = subs[0]
    const plan = await findById('subscription_plans', sub.plan_id as string)
    res.json({ ...sub, plan })
  }),
)

router.post(
  '/',
  validateBody(createSubscriptionSchema),
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return
    const { planId, paymentMethodId, preferences } = req.body as z.infer<
      typeof createSubscriptionSchema
    >

    const plan = (await findById('subscription_plans', planId)) as Record<string, unknown> | null
    if (!plan || plan.status !== 'active') {
      res.status(404).json({ error: t('plans.notFound', {}, { defaultValue: 'Plan not found' }) })
      return
    }

    const existing = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ])
    if (existing) {
      res.status(409).json({
        error: t(
          'subscription.alreadyActive',
          {},
          { defaultValue: 'You already have an active subscription' },
        ),
      })
      return
    }

    const payments = get<PaymentProvider>('payments', 'stripe')
    let checkoutUrl: string | undefined
    const stripePriceId = plan.stripe_price_id as string | null | undefined
    if (payments?.updateSubscription && stripePriceId) {
      try {
        const result = await payments.updateSubscription({
          userId,
          newProductId: stripePriceId,
        })
        checkoutUrl = result.checkoutUrl
      } catch (error) {
        // Live billing not provisioned — log and proceed with a local-only
        // subscription record. The user still gets the local subscription so
        // the rest of the UI works in dev/no-stripe environments. STATUS.md
        // tracks the BLOCKED state when STRIPE_SECRET_KEY isn't set.
        logger.warn(
          { error, userId, planId },
          'stripe updateSubscription failed; using local-only subscription',
        )
      }
    } else if (payments?.updateSubscription) {
      // No real Stripe price id configured for this plan. Skip the Stripe
      // round-trip rather than handing it the DB UUID — Stripe would
      // reject with "No such price: <uuid>" and surface it as a 500.
      logger.warn({ userId, planId }, 'plan has no stripe_price_id; subscription is local-only')
    }

    const interval = (plan.interval as string) ?? 'month'
    const intervalCount = Number(plan.interval_count ?? 1)
    const now = new Date().toISOString()

    const subscriptionResult = await create('subscriptions', {
      user_id: userId,
      plan_id: planId,
      status: 'active',
      payment_subscription_id: paymentMethodId,
      preferences: JSON.stringify(preferences ?? {}),
      current_period_start: now,
      next_billing_date: nextBillingDate(interval, intervalCount),
    })
    const subscription = (subscriptionResult.data ?? subscriptionResult) as Record<string, unknown>

    await ensurePendingBox(userId, subscription.id as string, plan)

    const user = await findById('users', userId)
    if (user) {
      await sendMail({
        to: (user as Record<string, unknown>).email as string,
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        subject: t(
          'subscription.welcomeSubject',
          {},
          { defaultValue: 'Welcome to your subscription!' },
        ),
        text: t(
          'subscription.welcomeBody',
          { plan: plan.name as string },
          { defaultValue: `Your ${plan.name as string} subscription is now active.` },
        ),
      }).catch((mailError) => {
        // Mail provider not configured in dev — log so it shows in dev.log
        // instead of a silent swallow that pretends the email went out.
        logger.warn({ mailError, userId }, 'subscription welcome email failed to send')
      })
    }

    res.status(201).json({ ...subscription, checkoutUrl: checkoutUrl ?? null })
  }),
)

router.put(
  '/mine/preferences',
  validateBody(preferencesSchema),
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const sub = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['active', 'paused'] },
    ])
    if (!sub) {
      res
        .status(404)
        .json({ error: t('subscription.notFound', {}, { defaultValue: 'No active subscription' }) })
      return
    }

    const updated = await updateById('subscriptions', sub.id as string, {
      preferences: JSON.stringify((req.body as z.infer<typeof preferencesSchema>).preferences),
    })
    res.json(updated.data ?? updated)
  }),
)

router.post(
  '/mine/pause',
  wrap(async (_req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const sub = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ])
    if (!sub) {
      res
        .status(404)
        .json({ error: t('subscription.notFound', {}, { defaultValue: 'No active subscription' }) })
      return
    }

    const updated = await updateById('subscriptions', sub.id as string, {
      status: 'paused',
      paused_at: new Date().toISOString(),
    })
    res.json(updated.data ?? updated)
  }),
)

router.post(
  '/mine/resume',
  wrap(async (_req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const sub = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'paused' },
    ])
    if (!sub) {
      res
        .status(404)
        .json({ error: t('subscription.notFound', {}, { defaultValue: 'No paused subscription' }) })
      return
    }

    const updated = await updateById('subscriptions', sub.id as string, {
      status: 'active',
      paused_at: null,
    })
    const updatedSub = (updated.data ?? updated) as Record<string, unknown>

    const plan = (await findById('subscription_plans', updatedSub.plan_id as string)) as Record<
      string,
      unknown
    > | null
    if (plan) {
      await ensurePendingBox(userId, updatedSub.id as string, plan)
    }

    res.json(updatedSub)
  }),
)

router.post(
  '/mine/cancel',
  validateBody(cancelSchema),
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const sub = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['active', 'paused'] },
    ])
    if (!sub) {
      res
        .status(404)
        .json({ error: t('subscription.notFound', {}, { defaultValue: 'No active subscription' }) })
      return
    }

    const payments = get<PaymentProvider>('payments', 'stripe')
    if (payments?.cancelSubscription && sub.payment_subscription_id) {
      try {
        await payments.cancelSubscription({ userId })
      } catch (error) {
        logger.warn(
          { error, userId },
          'stripe cancelSubscription failed; cancelling local subscription anyway',
        )
      }
    }

    const updated = await updateById('subscriptions', sub.id as string, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: (req.body as z.infer<typeof cancelSchema>).reason ?? null,
    })
    res.json(updated.data ?? updated)
  }),
)

export default router
