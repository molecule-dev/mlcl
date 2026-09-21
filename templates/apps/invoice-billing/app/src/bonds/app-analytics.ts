/**
 * Analytics bond setup + auto-tracking for the reference flagship app.
 *
 * Provider wiring is env-driven and OPT-IN: when `VITE_POSTHOG_KEY` is set,
 * the PostHog provider is bonded (events go to PostHog cloud by default;
 * point `VITE_POSTHOG_HOST` at an EU-cloud/self-hosted/test ingest origin to
 * override). Without a key, NO provider is bonded and every analytics call —
 * including the `AnalyticsRouteListener` page views and the auto-tracked
 * auth/http events — is a silent no-op: nothing is sent anywhere.
 *
 * To swap vendors, change the provider import to another analytics bond
 * (e.g. `@molecule/app-analytics-mixpanel`) — the rest of the app only
 * talks to `@molecule/app-analytics`.
 *
 * ORDER MATTERS: `setupAutoTracking()` captures the bonded provider once at
 * setup time, so `setProvider()` must run BEFORE it.
 */

import { setProvider, setupAutoTracking } from '@molecule/app-analytics'
import { createProvider as createPostHogProvider } from '@molecule/app-analytics-posthog'
import { getClient } from '@molecule/app-http'
import { getRouter } from '@molecule/app-routing'

import { authClient } from './auth-default.js'

let cleanupAutoTracking: (() => void) | undefined

export function setupAppAnalytics(): void {
  const apiKey = import.meta.env?.VITE_POSTHOG_KEY as string | undefined
  const host = import.meta.env?.VITE_POSTHOG_HOST as string | undefined
  if (apiKey) {
    setProvider(createPostHogProvider({ apiKey, ...(host ? { host } : {}) }))
  }
  cleanupAutoTracking = setupAutoTracking({
    authClient,
    router: getRouter(),
    httpClient: getClient() as Parameters<typeof setupAutoTracking>[0]['httpClient'],
  })
}

export function teardownAppAnalytics(): void {
  cleanupAutoTracking?.()
  cleanupAutoTracking = undefined
}
