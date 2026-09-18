/**
 * webhook-manager — queued webhook delivery worker.
 *
 * Deliveries flow through the queue bond (`@molecule/api-queue`): event
 * fanout (`POST /events`) and replay (`POST /deliveries/:id/replay`) create a
 * `webhook_deliveries` row in `queued` status and enqueue its id on the
 * `webhook-deliveries` queue via `enqueueDelivery()`. The worker — subscribed
 * at boot from `setupBonds()` via `startDeliveryWorker()` — performs the real
 * SSRF-safe HTTP POST and records the `queued → delivering → success/failed`
 * transition on the row, re-queues failed attempts up to the endpoint's
 * `retry_count` (delay via `WEBHOOK_RETRY_DELAY_SECONDS`, default 30), and
 * rolls the parent event's `delivery_status` up to
 * `delivered`/`partial`/`failed` once every fanned-out delivery is terminal.
 *
 * The queue provider is whatever `setupQueueRedis()` bonded — Redis when
 * `REDIS_URL` is set, the zero-credential in-process memory queue otherwise —
 * so the worker code is provider-agnostic.
 */

import { createHmac } from 'node:crypto'

import { findById, findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { send, subscribe } from '@molecule/api-queue'

import { safeFetch } from '../lib/safe-fetch.js'

/** Queue name shared by the enqueue sites and the worker. */
export const DELIVERY_QUEUE = 'webhook-deliveries'

/** Message body for a delivery job. */
interface DeliveryJob {
  deliveryId: string
}

const retryDelaySeconds = (): number => {
  const parsed = Number(process.env.WEBHOOK_RETRY_DELAY_SECONDS)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30
}

/**
 * Enqueues a `queued` delivery row for asynchronous processing. Best-effort:
 * an enqueue failure is logged and the row stays visibly `queued` in the UI
 * rather than failing the request that created it.
 *
 * @param deliveryId - The `webhook_deliveries` row id to process.
 */
export const enqueueDelivery = async (deliveryId: string): Promise<void> => {
  try {
    await send<DeliveryJob>(DELIVERY_QUEUE, { body: { deliveryId } })
  } catch (error) {
    logger.error(`webhook delivery ${deliveryId}: enqueue failed — row remains queued`, { error })
  }
}

/**
 * Rolls the parent event's `delivery_status` up from its deliveries once none
 * are still `queued`/`delivering`: `delivered` when all succeeded, `failed`
 * when all failed, `partial` otherwise (matching the Events UI vocabulary).
 */
const rollUpEventStatus = async (delivery: Record<string, unknown>): Promise<void> => {
  const eventId = delivery.event_id
  const userId = delivery.user_id
  if (typeof eventId !== 'string' || !eventId || typeof userId !== 'string') return
  const siblings = await findMany<Record<string, unknown>>('webhook_deliveries', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'event_id', operator: '=', value: eventId },
    ],
  })
  if (siblings.some((d) => d.status === 'queued' || d.status === 'delivering')) return
  const failed = siblings.filter((d) => d.status === 'failed').length
  const status = failed === 0 ? 'delivered' : failed === siblings.length ? 'failed' : 'partial'
  await updateById('events', eventId, { delivery_status: status })
}

/**
 * Processes one queued delivery: resolves the row + its endpoint, marks it
 * `delivering`, POSTs the payload via the SSRF-safe fetch, and records the
 * terminal `success`/`failed` state (or re-queues a failed attempt while the
 * endpoint's retry budget lasts).
 *
 * @param deliveryId - The `webhook_deliveries` row id to process.
 */
export const processDelivery = async (deliveryId: string): Promise<void> => {
  const delivery = await findById<Record<string, unknown>>('webhook_deliveries', deliveryId)
  // Redelivery-idempotent: rows another attempt already finished are skipped;
  // a row stuck in `delivering` (crash mid-flight) is retried — at-least-once.
  if (!delivery || (delivery.status !== 'queued' && delivery.status !== 'delivering')) return

  const webhook =
    typeof delivery.webhook_id === 'string'
      ? await findById<Record<string, unknown>>('webhooks', delivery.webhook_id)
      : null
  const url =
    (typeof delivery.url === 'string' && delivery.url) ||
    (typeof webhook?.url === 'string' ? webhook.url : '')

  if (!webhook || webhook.is_active !== true || !url) {
    await updateById('webhook_deliveries', deliveryId, {
      status: 'failed',
      status_code: 0,
      status_text: 'skipped',
      response_body: !webhook
        ? 'endpoint deleted'
        : webhook.is_active !== true
          ? 'endpoint paused'
          : 'missing URL',
      delivered_at: new Date(),
    })
    await rollUpEventStatus(delivery)
    return
  }

  await updateById('webhook_deliveries', deliveryId, { status: 'delivering', url })

  const contentType =
    typeof webhook.content_type === 'string' ? webhook.content_type : 'application/json'
  const requestBody = typeof delivery.request_body === 'string' ? delivery.request_body : ''
  // Sign the payload so the receiver can verify it actually came from us. The
  // per-endpoint `secret` is generated + rotatable in webhooks.ts and the UI
  // PROMISES this ("sign every payload with HMAC-SHA256"; "Verify the
  // X-Relay-Signature header against this secret") — without it the secret is
  // decorative and the documented verification instructions are unfulfillable.
  // The header is the raw HMAC-SHA256 hex digest over the exact bytes sent, so a
  // receiver recomputes it and compares directly. X-Relay-Delivery-Id is the
  // stable idempotency key for at-least-once redelivery dedup.
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'X-Relay-Delivery-Id': deliveryId,
  }
  if (typeof webhook.secret === 'string' && webhook.secret) {
    headers['X-Relay-Signature'] = createHmac('sha256', webhook.secret)
      .update(requestBody)
      .digest('hex')
  }
  const startTime = Date.now()
  let statusCode = 0
  // No initializers: both the try and the catch below assign these before use,
  // so an initial value is dead (eslint no-useless-assignment).
  let statusText: string
  let responseBody: string
  let ok = false
  let blocked = false
  try {
    const response = await safeFetch(url, {
      method: 'POST',
      headers,
      body: requestBody,
    })
    statusCode = response.status
    responseBody = await response.text()
    ok = response.ok
    statusText = ok ? 'OK' : 'failed'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed'
    const causeMessage =
      error instanceof Error && error.cause instanceof Error ? error.cause.message : ''
    blocked = /SSRF|private\/internal|blocked|Only http|Invalid URL/i.test(
      `${message} ${causeMessage}`,
    )
    responseBody = blocked ? causeMessage || message : message
    statusText = blocked ? 'blocked' : 'failed'
  }
  const duration = Date.now() - startTime

  const attempts = typeof delivery.retry_count === 'number' ? delivery.retry_count : 0
  const maxRetries = typeof webhook.retry_count === 'number' ? webhook.retry_count : 3
  // A blocked URL never becomes deliverable — don't burn retries on it.
  if (!ok && !blocked && attempts < maxRetries) {
    await updateById('webhook_deliveries', deliveryId, {
      status: 'queued',
      status_code: statusCode,
      status_text: statusText,
      response_body: responseBody,
      duration_ms: duration,
      retry_count: attempts + 1,
    })
    await send<DeliveryJob>(DELIVERY_QUEUE, {
      body: { deliveryId },
      delaySeconds: retryDelaySeconds(),
    })
    return
  }

  await updateById('webhook_deliveries', deliveryId, {
    status: ok ? 'success' : 'failed',
    status_code: statusCode,
    status_text: statusText,
    response_body: responseBody,
    duration_ms: duration,
    delivered_at: new Date(),
  })
  await rollUpEventStatus(delivery)

  // Refresh the endpoint's rolling 24h health stats (shown on the Endpoints + Dashboard cards) from
  // the delivery history. The worker maintained the per-delivery rows but never the parent webhook's
  // counters, so last_delivered_at / deliveries_24h / failures_24h / success_rate / p95 were frozen
  // at their create-time defaults. Recompute over the 24h window so the numbers stay accurate — a
  // monotonic increment would never decay as deliveries age out of the window.
  const webhookId = delivery.webhook_id ? String(delivery.webhook_id) : null
  if (webhookId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recent = await findMany<Record<string, unknown>>('webhook_deliveries', {
      where: [
        { field: 'webhook_id', operator: '=', value: webhookId },
        { field: 'delivered_at', operator: '>=', value: since },
      ],
      limit: 10_000,
    })
    const deliveries24h = recent.length
    const failures24h = recent.filter((d) => d.status === 'failed').length
    const durations = recent.map((d) => Number(d.duration_ms ?? 0)).sort((a, b) => a - b)
    const p95 = durations.length
      ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]
      : 0
    await updateById('webhooks', webhookId, {
      last_delivered_at: new Date(),
      deliveries_24h: deliveries24h,
      failures_24h: failures24h,
      // success_rate_24h is stored as a fraction (0-1), matching the fixtures/UI.
      success_rate_24h: deliveries24h > 0 ? (deliveries24h - failures24h) / deliveries24h : 0,
      p95_latency_ms: p95,
      updated_at: new Date(),
    })
  }
}

let unsubscribe: (() => void) | null = null

/**
 * Subscribes the delivery worker to the `webhook-deliveries` queue. Called
 * once from `setupBonds()` after the queue provider is bonded; safe to call
 * repeatedly (subsequent calls are no-ops while a subscription is live).
 */
export const startDeliveryWorker = (): void => {
  if (unsubscribe) return
  unsubscribe = subscribe<DeliveryJob>(
    DELIVERY_QUEUE,
    async (message) => {
      await processDelivery(message.body.deliveryId)
    },
    { maxMessages: 4 },
  )
}

/** Stops the delivery worker (tests/teardown). */
export const stopDeliveryWorker = (): void => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
