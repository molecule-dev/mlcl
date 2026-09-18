/**
 * Shared E2E helpers for signing Stripe webhook payloads.
 *
 * Implements the Stripe webhook signature scheme directly (HMAC-SHA256 over
 * `<timestamp>.<payload>`, returned as `t=<ts>,v1=<hex>`) so per-app billing
 * specs can post a webhook to `/api/users/payment-notification/stripe` and
 * exercise the real `@molecule/api-resource-user` `handlePaymentNotification`
 * code path — including signature verification — without the `stripe` SDK
 * and without a live Stripe account.
 *
 * @see https://docs.stripe.com/webhooks/signatures
 *
 * Production note: `@molecule/api-payments-stripe`'s `verifyWebhookSignature`
 * delegates to `Stripe.webhooks.constructEvent`, which (a) needs
 * `STRIPE_SECRET_KEY` set even though it never calls the API for verification
 * (the SDK lazily instantiates the client), and (b) enforces a default
 * tolerance of 5 minutes on the signed timestamp. These helpers default to
 * the current wall clock to stay inside that window.
 */

import { createHmac } from 'node:crypto'

/**
 * The minimal shape a `customer.subscription.*` webhook needs to drive the
 * molecule webhook handler. Anything not listed here is ignored, but Stripe's
 * own validators will reject obviously-malformed payloads — keep this
 * faithful to the real shape.
 */
export interface StripeSubscriptionEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: {
      id: string
      object: 'subscription'
      customer: string
      status: string
      cancel_at_period_end: boolean
      canceled_at: number | null
      items: {
        data: Array<{
          id: string
          price: { id: string; product: string }
          current_period_end: number
        }>
      }
    }
  }
}

/**
 * The minimal shape an `invoice.*` event needs. Only present so specs
 * exercising invoice flows can use the same signing helper without
 * smuggling untyped objects through.
 */
export interface StripeInvoiceEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: {
      id: string
      object: 'invoice'
      customer: string
      subscription: string
      status: string
    }
  }
}

/**
 * Result of signing a payload — both the canonical body and the
 * `Stripe-Signature` header it must be sent with.
 */
export interface SignedStripePayload {
  /** The exact JSON body to POST. Must not be re-stringified. */
  body: string
  /** The `Stripe-Signature` header value (`t=<ts>,v1=<hex>`). */
  signature: string
  /** The unix-second timestamp embedded in the signature. */
  timestamp: number
}

/**
 * HMAC-SHA256 sign a payload per Stripe's webhook scheme.
 *
 * @param payload - The JSON-serialisable event object.
 * @param secret - The webhook signing secret (`STRIPE_WEBHOOK_SECRET`).
 * @param opts - Optional overrides; `timestamp` is mostly useful for tests
 *   that want to assert tolerance handling.
 * @returns The serialised body, signature header value, and timestamp.
 */
export function signStripePayload(
  payload: object,
  secret: string,
  opts: { timestamp?: number } = {},
): SignedStripePayload {
  if (!secret) {
    throw new Error('signStripePayload: secret is required')
  }
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000)
  const body = JSON.stringify(payload)
  const signedPayload = `${timestamp}.${body}`
  const signature = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
  return {
    body,
    signature: `t=${timestamp},v1=${signature}`,
    timestamp,
  }
}

interface SubscriptionEventOptions {
  /** Stripe customer ID (`cus_…`). Must already exist on a payment record. */
  customerId: string
  /** Stripe price ID (`price_…`); the `priceId` Stripe sets on `items.data[].price`. */
  priceId?: string
  /** Stripe product ID (`prod_…`); the `productId` molecule's plan registry matches. */
  productId: string
  /** Subscription expiry. Stripe expresses this as `current_period_end` in seconds. */
  expiresAt: Date
  /** Optional override for the subscription ID. */
  subscriptionId?: string
  /** Optional override for the event ID. */
  eventId?: string
  /** Optional override for the subscription status (defaults to `active`). */
  status?: string
}

/**
 * Build a minimal `customer.subscription.created` event payload that the
 * molecule webhook handler will accept. `productId` is the molecule plan
 * lookup key (matched against `Plan.platformProductId`).
 */
export function subscriptionCreatedEvent(opts: SubscriptionEventOptions): StripeSubscriptionEvent {
  return buildSubscriptionEvent('customer.subscription.created', opts)
}

/**
 * Build a `customer.subscription.updated` event — used by callers exercising
 * tier upgrades/downgrades that don't tear the subscription down.
 */
export function subscriptionUpdatedEvent(opts: SubscriptionEventOptions): StripeSubscriptionEvent {
  return buildSubscriptionEvent('customer.subscription.updated', opts)
}

interface DeletedEventOptions {
  customerId: string
  /** Optional priceId if the spec asserts on the items array. */
  priceId?: string
  /** Optional productId. Defaults to `prod_deleted_no_match` so the handler clears planKey. */
  productId?: string
  /** Optional override for the subscription ID. */
  subscriptionId?: string
  /** Optional override for the event ID. */
  eventId?: string
}

/**
 * Build a `customer.subscription.deleted` event that drives the handler's
 * cancellation branch (clears `planKey` + `planAutoRenews`).
 */
export function subscriptionDeletedEvent(opts: DeletedEventOptions): StripeSubscriptionEvent {
  return buildSubscriptionEvent('customer.subscription.deleted', {
    customerId: opts.customerId,
    productId: opts.productId ?? 'prod_deleted_no_match',
    priceId: opts.priceId,
    expiresAt: new Date(),
    subscriptionId: opts.subscriptionId,
    eventId: opts.eventId,
    status: 'canceled',
  })
}

interface InvoiceEventOptions {
  customerId: string
  subscriptionId: string
  status?: string
  invoiceId?: string
  eventId?: string
}

/**
 * Build a minimal `invoice.payment_succeeded` event — molecule's webhook
 * handler currently only switches on `customer.subscription.*` types but
 * rejects unsigned bodies wholesale, so signed invoice payloads are useful
 * for verifying the signature path returns 200 without altering plan state.
 */
export function invoicePaymentSucceededEvent(opts: InvoiceEventOptions): StripeInvoiceEvent {
  return {
    id: opts.eventId ?? `evt_inv_${randomSuffix()}`,
    object: 'event',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: opts.invoiceId ?? `in_${randomSuffix()}`,
        object: 'invoice',
        customer: opts.customerId,
        subscription: opts.subscriptionId,
        status: opts.status ?? 'paid',
      },
    },
  }
}

function buildSubscriptionEvent(
  type: string,
  opts: SubscriptionEventOptions,
): StripeSubscriptionEvent {
  const subscriptionId = opts.subscriptionId ?? `sub_${randomSuffix()}`
  const periodEnd = Math.floor(opts.expiresAt.getTime() / 1000)
  return {
    id: opts.eventId ?? `evt_sub_${randomSuffix()}`,
    object: 'event',
    type,
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
        customer: opts.customerId,
        status: opts.status ?? (type === 'customer.subscription.deleted' ? 'canceled' : 'active'),
        cancel_at_period_end: type === 'customer.subscription.deleted',
        canceled_at: type === 'customer.subscription.deleted' ? periodEnd : null,
        items: {
          data: [
            {
              id: `si_${randomSuffix()}`,
              price: {
                id: opts.priceId ?? `price_${randomSuffix()}`,
                product: opts.productId,
              },
              current_period_end: periodEnd,
            },
          ],
        },
      },
    },
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 12)
}
