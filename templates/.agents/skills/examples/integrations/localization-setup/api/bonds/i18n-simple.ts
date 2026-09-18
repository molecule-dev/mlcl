/**
 * API i18n bond setup.
 *
 * Wires @molecule/api-i18n-simple as the i18n provider so handlers
 * can call t() from @molecule/api-i18n.
 *
 * Locale bonds are per-feature companion packages (e.g. @molecule/api-locales-user,
 * @molecule/api-locales-config) — NOT per-language. Each companion bond ships
 * translations for all 79 supported languages automatically. There are no
 * @molecule/api-locales-en / -es / -fr packages.
 *
 * Import the companion locale bonds for each @molecule/api-* feature package
 * your app depends on. They auto-register when imported.
 */

import { setProvider } from '@molecule/api-i18n'
import { provider } from '@molecule/api-i18n-simple'

// Companion locale bonds for each @molecule/api-* feature your app uses.
// Add one import per feature package — each ships all 79 languages.
// Example:
//   import '@molecule/api-locales-user'
//   import '@molecule/api-locales-config'
//   import '@molecule/api-locales-emails'

export function setupI18nSimple(): void {
  setProvider(provider)
}
