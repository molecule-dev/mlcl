/**
 * Checkout handler — `/api/checkout/*`. One-time Stripe Checkout sessions
 * for buying a single course, plus the webhook + simulate endpoints used
 * by the smoke-app fulfillment flow.
 *
 * The course-marketplace subscription tiers (Pro Monthly etc.) are
 * handled by routes/billing.ts. This handler is for per-course payment
 * checkouts (mode: 'payment') that fulfil into an `enrollments` row.
 *
 * Modeled on `digital-goods-store/api/src/handlers/checkout.ts`.
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { getClient as getStripe, verifyWebhookSignature } from '@molecule/api-payments-stripe'

const router = Router()

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  return Number(v)
}

const createSessionSchema = z.object({
  course_id: z.string().uuid(),
})

/**
 * Idempotent fulfillment: create the payment row + enrollment for a
 * paid course session. Safe to call twice (Stripe sometimes redelivers
 * `checkout.session.completed`).
 */
async function fulfillCourseCheckout(args: {
  userId: string
  courseId: string
  amountCents: number
  currency: string
  paymentRef: string
  receiptUrl?: string | null
}): Promise<{ enrollmentId: string; paymentId: string }> {
  const existingPayment = await findOne<Record<string, unknown>>('payments', [
    { field: 'transactionId', operator: '=', value: args.paymentRef },
  ])

  let paymentId: string
  if (existingPayment) {
    paymentId = String(existingPayment.id)
  } else {
    // The `payments` table is the canonical @molecule/api-resource-payment
    // schema (userId/transactionId/productId/platformKey/data/receipt) — not
    // a per-app schema with amount/currency/status columns. Stash the
    // course id, money fields, and Stripe receipt URL inside `data` so we
    // don't need a migration just to track per-purchase metadata.
    const paymentResult = await create<Record<string, unknown>>('payments', {
      id: crypto.randomUUID(),
      userId: args.userId,
      transactionId: args.paymentRef,
      productId: args.courseId,
      platformKey: 'stripe',
      data: {
        amountCents: args.amountCents,
        currency: (args.currency || 'USD').toUpperCase(),
        status: 'completed',
        courseId: args.courseId,
        receiptUrl: args.receiptUrl ?? null,
      },
      receipt: args.receiptUrl ?? null,
    })
    const row = (paymentResult.data ?? paymentResult) as Record<string, unknown>
    paymentId = String(row.id)
  }

  const existingEnrollment = await findOne<Record<string, unknown>>('enrollments', [
    { field: 'user_id', operator: '=', value: args.userId },
    { field: 'course_id', operator: '=', value: args.courseId },
  ])

  if (existingEnrollment) {
    if (!existingEnrollment.payment_id) {
      await updateById('enrollments', String(existingEnrollment.id), {
        payment_id: paymentId,
        updated_at: new Date(),
      })
    }
    return { enrollmentId: String(existingEnrollment.id), paymentId }
  }

  const enrollResult = await create<Record<string, unknown>>('enrollments', {
    user_id: args.userId,
    course_id: args.courseId,
    payment_id: paymentId,
    progress: 0,
    completed_at: null,
    enrolled_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  })
  const enrollRow = (enrollResult.data ?? enrollResult) as Record<string, unknown>

  // Bump the parent course's enrollment counter.
  try {
    const course = await findById<Record<string, unknown>>('courses', args.courseId)
    if (course) {
      await updateById('courses', args.courseId, {
        total_enrollments: toNum(course.total_enrollments) + 1,
      })
    }
  } catch (err) {
    logger.error('Failed to bump course enrollment counter', err)
  }

  // Receipt notification (in-app, best-effort).
  try {
    const course = await findById<Record<string, unknown>>('courses', args.courseId)
    await create('notifications', {
      user_id: args.userId,
      type: 'enrollment',
      title: 'Enrollment confirmed',
      body: `You're enrolled in "${String(course?.title ?? 'your course')}". Start watching any time.`,
      href: `/courses/${args.courseId}`,
      entity_id: args.courseId,
      unread: true,
      read_at: null,
      created_at: new Date(),
    })
  } catch (err) {
    logger.error('Failed to create enrollment notification', err)
  }

  return { enrollmentId: String(enrollRow.id), paymentId }
}

router.post(
  '/create-session',
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { course_id } = req.body as z.infer<typeof createSessionSchema>
    const course = await findById<Record<string, unknown>>('courses', course_id)
    if (!course || course.status !== 'published') {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }

    const existingEnrollment = await findOne<Record<string, unknown>>('enrollments', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: course_id },
    ])
    if (existingEnrollment) {
      res.status(409).json({
        error: t('enrollments.alreadyEnrolled', undefined, {
          defaultValue: 'You are already enrolled in this course.',
        }),
        enrollmentId: String(existingEnrollment.id),
      })
      return
    }

    const priceCents = toNum(course.price_cents)
    if (priceCents === 0) {
      const fulfilled = await fulfillCourseCheckout({
        userId,
        courseId: course_id,
        amountCents: 0,
        currency: 'USD',
        paymentRef: `free_${crypto.randomUUID()}`,
      })
      res.json({
        free: true,
        enrollmentId: fulfilled.enrollmentId,
      })
      return
    }

    const stripeClient = getStripe()
    if (!stripeClient) {
      res.status(503).json({
        error: t('billing.error.providerUnavailable', undefined, {
          defaultValue: 'Billing provider unavailable. Try again later.',
        }),
      })
      return
    }

    const origin =
      (req.headers.origin as string | undefined) ??
      `${req.protocol}://${req.get('host') ?? 'localhost'}`

    try {
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: priceCents,
              product_data: {
                name: String(course.title ?? 'Course enrollment'),
                ...(course.description
                  ? { description: String(course.description).slice(0, 200) }
                  : {}),
                ...(course.thumbnail_url ? { images: [String(course.thumbnail_url)] } : {}),
              },
            },
          },
        ],
        success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/courses/${course_id}?canceled=1`,
        metadata: {
          userId,
          courseId: course_id,
        },
      })
      res.json({
        sessionId: session.id,
        url: session.url,
      })
    } catch (err) {
      logger.error('checkout/create-session failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Stripe webhook receiver. Uses `req.rawBody` (set by the global body-parser
 * middleware via its `verify` callback) so signature verification sees the
 * unparsed bytes even though Express has already JSON-parsed `req.body`. Do NOT
 * add a route-level `express.raw()` — the global JSON parser already consumed the
 * body, so `req.body` here is the PARSED object, not a Buffer. Handles
 * `checkout.session.completed` (course one-time payments).
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string | undefined
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }
  const rawBody = (req as Request & { rawBody?: string }).rawBody
  if (!rawBody) {
    res.status(400).json({ error: 'Missing raw body for webhook verification' })
    return
  }
  let event
  try {
    event = verifyWebhookSignature(Buffer.from(rawBody, 'utf8'), signature)
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Record<string, unknown>
      const metadata = (session.metadata as Record<string, string> | undefined) ?? {}
      const userId = metadata.userId
      const courseId = metadata.courseId
      const paymentRef = (session.payment_intent as string | null) ?? String(session.id)
      const amountTotal = toNum(session.amount_total)
      const currency = String(session.currency ?? 'usd')
      if (userId && courseId) {
        await fulfillCourseCheckout({
          userId,
          courseId,
          amountCents: amountTotal,
          currency,
          paymentRef,
        })
      } else {
        logger.error('checkout.session.completed missing metadata', { session })
      }
    }
  } catch (err) {
    logger.error('webhook fulfillment failed', err)
    res.status(500).json({ error: 'Webhook processing failed' })
    return
  }
  res.json({ received: true })
})

/**
 * Test-only endpoint: simulate a successful checkout for the given
 * sessionId. E2E uses this to bypass the Stripe-hosted card form when
 * proving the backend fulfillment + downstream UI works. Disabled in
 * production; the real path is the webhook above.
 */
const simulateSchema = z.object({
  sessionId: z.string().min(1),
})

router.post('/simulate', validateBody(simulateSchema), async (req: Request, res: Response) => {
  // Fail CLOSED: this test seam enrolls the user with NO payment verification, so it
  // must be off by default. Gating on NODE_ENV was fail-OPEN (scaffold ships
  // NODE_ENV=development → live enrollment bypass out of the box). [P5TPL-1/RVALL]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const { sessionId } = req.body as z.infer<typeof simulateSchema>
    const stripeClient = getStripe()
    if (!stripeClient) {
      res.status(503).json({ error: 'Stripe unavailable' })
      return
    }
    const session = await stripeClient.checkout.sessions.retrieve(sessionId)
    const metadata = (session.metadata as Record<string, string> | null) ?? {}
    const userId = metadata.userId
    const courseId = metadata.courseId
    if (!userId || !courseId) {
      res.status(400).json({ error: 'Session missing metadata.userId/courseId' })
      return
    }
    const paymentRef = (session.payment_intent as string | null) ?? session.id
    const fulfilled = await fulfillCourseCheckout({
      userId,
      courseId,
      amountCents: session.amount_total ?? 0,
      currency: String(session.currency ?? 'usd'),
      paymentRef,
    })
    res.json({ ...fulfilled, sessionId, courseId })
  } catch (err) {
    logger.error('checkout/simulate failed', err)
    res.status(500).json({
      error: 'Simulate failed',
    })
  }
})

/**
 * GET /api/checkout/session/:sessionId — fetch a Stripe session by id and
 * return enrollment status. The /checkout/return success page polls this
 * after Stripe redirects back so the user lands on a page with their
 * enrollment confirmed.
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const sessionId = req.params.sessionId as string
    const stripeClient = getStripe()
    if (!stripeClient) {
      res.status(503).json({ error: 'Stripe unavailable' })
      return
    }
    const session = await stripeClient.checkout.sessions.retrieve(sessionId)
    if (session.metadata?.userId !== userId) {
      res.status(403).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const courseId = session.metadata?.courseId ?? null
    const enrollment = courseId
      ? await findOne<Record<string, unknown>>('enrollments', [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'course_id', operator: '=', value: courseId },
        ])
      : null
    res.json({
      sessionId,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      courseId,
      enrollmentId: enrollment?.id ?? null,
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
