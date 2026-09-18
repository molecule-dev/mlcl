/**
 * I18n bond setup
 *
 * Wires @molecule/api-i18n-simple as the i18n provider so handlers can call t().
 */

import { setProvider } from '@molecule/api-i18n'
import { provider } from '@molecule/api-i18n-simple'

export function setupI18nSimple(): void {
  setProvider(provider)
}
