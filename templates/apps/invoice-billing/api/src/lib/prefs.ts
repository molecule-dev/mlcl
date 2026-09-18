/**
 * Shared user-preference resolvers.
 *
 * @module
 */
import { findById } from '@molecule/api-database'

/**
 * The default currency is a saved user preference
 * (users.oauthData.preferences.currency, default "USD"). New-invoice and
 * recurring-invoice create hardcoded "USD", so the "Default currency" setting
 * did nothing — the same drop invoicePrefix and defaultDueDays had before they
 * were wired in. Resolve it here so both create paths honor the saved default.
 */
export async function resolveCurrency(userId: string): Promise<string> {
  const user = await findById<{ oauthData?: { preferences?: { currency?: string } } | null }>(
    'users',
    userId,
  )
  const currency = user?.oauthData?.preferences?.currency
  return typeof currency === 'string' && currency.length > 0 ? currency : 'USD'
}
