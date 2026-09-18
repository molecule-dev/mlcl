/**
 * Shared translation key types.
 *
 * Intentionally LOOSE: `Partial<CommonTranslations>` (the common keys, all
 * optional) intersected with `Record<string, string>` (any app-specific key).
 *
 * Why loose, not an enumerated object type: each locale may legitimately provide
 * only a SUBSET of keys — at runtime `t('key', vals, { defaultValue })` falls back
 * to the default locale / the inline English default, so a missing translation is
 * not an error. A strict object type would force every one of the 79 locale files
 * to carry every key, so adding a single new UI string would break the build until
 * all 79 are updated by hand. Keep this loose; the flagship templates use the same
 * shape. (An app that genuinely wants completeness-enforcement can opt in by
 * replacing this with an explicit object type listing every key.)
 */

import type { CommonTranslations } from '@molecule/app-locales-common'

export type UiTranslations = Partial<CommonTranslations> & Record<string, string>

export type PrivacyPolicyContent = {
  'content.privacyPolicy': string
}

export type TermsOfServiceContent = {
  'content.termsOfService': string
}
