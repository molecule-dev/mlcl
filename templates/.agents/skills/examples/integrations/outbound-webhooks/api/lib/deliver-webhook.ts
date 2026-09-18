import { createHmac } from 'node:crypto'

import { safeFetch } from '@molecule/api-webhook-http'

/**
 * Deliver one event to one endpoint.
 *
 * The security-critical part — refusing to connect to internal addresses — is
 * NOT hand-rolled here. It lives in `@molecule/api-webhook-http`'s `safeFetch`,
 * which blocks private/loopback/link-local/cloud-metadata targets by RESOLVED IP
 * (checking literal-IP hosts synchronously AND hostnames inside the connect-time
 * DNS lookup, so there's no rebinding window), rejects non-http(s) schemes, and
 * refuses to follow redirects (a 3xx can't rebind to an internal host). A naive
 * `fetch(userUrl)` is the #1 outbound-webhook vulnerability (SSRF to
 * 169.254.169.254 → steal instance creds); DO NOT reimplement the guard — use
 * the bond.
 *
 * Here we only add the HMAC signature the receiver verifies + a timeout.
 *
 * `deliveryId` is a STABLE idempotency key: delivery is at-least-once (you retry
 * failures), and a receiver that processed the event but whose 2xx response was
 * lost gets the retry as an indistinguishable duplicate — the signature is no help
 * (identical payloads sign identically). Generate ONE id per logical delivery
 * (e.g. `crypto.randomUUID()`) and pass the SAME id on every retry of it, so the
 * receiver can dedup (process each `X-Webhook-Delivery-Id` once).
 */

export type DeliveryResult = { ok: boolean; status?: number; error?: string }

export async function deliverWebhook({
  url,
  secret,
  event,
  payload,
  deliveryId,
  timeoutMs = 5000,
}: {
  url: string
  secret: string
  event: string
  payload: unknown
  deliveryId: string
  timeoutMs?: number
}): Promise<DeliveryResult> {
  const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() })
  const signature = createHmac('sha256', secret).update(body).digest('hex')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        // Stable across retries so the receiver can dedup at-least-once redeliveries.
        'X-Webhook-Delivery-Id': deliveryId,
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    })
    // safeFetch uses redirect:'manual', so a 3xx surfaces as ok:false (not followed).
    return { ok: res.ok, status: res.status }
  } catch (err) {
    // Invalid URL / blocked scheme / SSRF block / network error / timeout all land
    // here — a bad target is a failed delivery, never a thrown request.
    return { ok: false, error: err instanceof Error ? err.message : 'delivery failed' }
  } finally {
    clearTimeout(timer)
  }
}
