/**
 * Client-side analytics bond: wires the PostHog provider so `track()` and
 * `identify()` (from `@molecule/app-analytics`, used in `app/lib/track.ts`)
 * actually reach PostHog.
 *
 * Provider wiring is env-driven and OPT-IN: when `VITE_POSTHOG_KEY` is set the
 * PostHog provider is bonded (events go to PostHog cloud by default; point
 * `VITE_POSTHOG_HOST` at an EU-cloud/self-hosted/test ingest origin to
 * override). Without a key NO provider is bonded and every analytics call is a
 * silent no-op — nothing is sent anywhere. Only the browser-safe project key
 * (`phc_...`) belongs here; never the API-side `POSTHOG_API_KEY`.
 *
 * To swap vendors, change the provider import to another analytics bond
 * (e.g. `@molecule/app-analytics-mixpanel`) — the rest of the app only talks
 * to `@molecule/app-analytics`.
 */

import { setProvider } from '@molecule/app-analytics'
import { createProvider as createPostHogProvider } from '@molecule/app-analytics-posthog'

export function setupAppAnalytics(): void {
  const apiKey = import.meta.env?.VITE_POSTHOG_KEY as string | undefined
  const host = import.meta.env?.VITE_POSTHOG_HOST as string | undefined
  if (apiKey) {
    setProvider(createPostHogProvider({ apiKey, ...(host ? { host } : {}) }))
  }
}
