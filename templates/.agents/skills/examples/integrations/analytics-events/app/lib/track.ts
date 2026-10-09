import { identify as bondIdentify, track as bondTrack } from '@molecule/app-analytics'

/**
 * Strongly-typed event catalog. Add new events here so the rest of
 * the app gets autocomplete + spelling-error protection.
 */
export type EventName =
  | 'signup_started'
  | 'signup_completed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'subscription_canceled'
  | 'feature_used'

export type EventPropsByName = {
  signup_started: { source?: string }
  signup_completed: { method: 'email' | 'google' | 'github' }
  checkout_started: { plan: string; price_cents: number }
  checkout_completed: { plan: string; price_cents: number; coupon?: string }
  subscription_canceled: { plan: string; reason?: string }
  feature_used: { feature: string }
}

export function track<N extends EventName>(name: N, props: EventPropsByName[N]): void {
  bondTrack({ name, properties: props as Record<string, unknown> })
}

export function identify(
  userId: string,
  traits: { email?: string; name?: string; plan?: string },
): void {
  // Don't pass PII to providers that don't need it. Email/name OK in
  // identify (the user's own profile); not in event properties.
  bondIdentify({
    userId,
    email: traits.email,
    name: traits.name,
    traits: traits as Record<string, unknown>,
  })
}
