import { useAuth } from '@molecule/app-react'

export type CarrierId = 'usps' | 'ups' | 'fedex' | 'dhl'

const CARRIERS: readonly CarrierId[] = ['usps', 'ups', 'fedex', 'dhl']

interface WithOauthData {
  oauthData?: Record<string, unknown> | null
}

/**
 * Resolve the user's configured default shipping carrier from their saved warehouse preferences
 * (`oauthData.warehousePrefs.defaultCarrier`, set on the Settings page). Falls back to 'usps' when
 * the preference is unset or not a known carrier. Pure — unit-testable without an auth provider.
 */
export function resolveDefaultCarrier(user: WithOauthData | null | undefined): CarrierId {
  const stored = (
    user?.oauthData as { warehousePrefs?: { defaultCarrier?: string } } | null | undefined
  )?.warehousePrefs?.defaultCarrier
  return CARRIERS.includes(stored as CarrierId) ? (stored as CarrierId) : 'usps'
}

/** The signed-in user's default carrier — seed a new shipment's carrier select from this. */
export function useDefaultCarrier(): CarrierId {
  const { user } = useAuth<WithOauthData>()
  return resolveDefaultCarrier(user)
}
