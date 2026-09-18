---
name: analytics-events
intent: |
  - "Track events"
  - "Analytics"
  - "Mixpanel / PostHog / Amplitude"
  - "Funnel tracking"
  - "User behavior tracking"
keywords: [analytics, events, tracking, mixpanel, posthog, funnel, telemetry]
---

# Analytics events (track + send to PostHog / Mixpanel)

**When to copy this example:** the user wants product analytics —
which buttons get clicked, where users drop off, conversion rates.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-analytics --workspace=api
npm install @molecule/app-analytics --workspace=app
# Plus a provider, e.g.:
npm install @molecule/api-analytics-posthog --workspace=api
npm install @molecule/app-analytics-posthog --workspace=app
```

## Files in this example

| Path                             | What it does                                                |
| -------------------------------- | ----------------------------------------------------------- |
| `api/bonds/analytics-posthog.ts` | Wires server-side track.                                    |
| `app/bonds/analytics-posthog.ts` | Wires client-side track + identify.                         |
| `app/lib/track.ts`               | Convenience wrapper: `track('checkout_started', { plan })`. |

## Anti-patterns

- Do not invent your own event names case-by-case. Define an
  enum / catalog so all event names are typed and grep-able.
- Do not track PII as event properties. Email, full name, etc.
  should NOT go to analytics.
- Do not track every render. Only track meaningful user actions
  (clicks, form submissions, conversions). Pageview is the one
  exception.
- Do not invent `@molecule/api-mixpanel` or
  `@molecule/api-amplitude` (unless they exist in the catalog you
  read in `molecule-packages` SKILL.md). Use the registered
  provider names exactly.
- Do not send the same event from both client and server unless
  you're explicit about deduping. Pick one side as the source of
  truth.

## Verify

Click "Start checkout" → event fires both client- and server-side
→ visible in PostHog within ~30s with the right user identity and
properties (plan, source).
