/**
 * i18n stores for this app's components.
 *
 * The framework binding's `createI18nStores()` returns a `t` store that only
 * forwards `(key, values)` — the provider's third `options` argument (the
 * `{ defaultValue }` English fallback every component here passes, matching
 * the React scaffold) is dropped before it reaches the provider. This wrapper
 * keeps the binding's reactive core (re-computed on every locale or
 * translation change) and restores the React-parity signature.
 */
import { derived, type Readable } from 'svelte/store'

import { getProvider, type InterpolationValues } from '@molecule/app-i18n'
import { createI18nStores } from '@molecule/app-svelte'

/**
 * Translation function with the React scaffold's signature: key, interpolation
 * values, and the `{ defaultValue }` fallback options.
 */
export type Translate = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string },
) => string

/** The binding's i18n stores with the React-parity `t` store. */
export type AppI18nStores = ReturnType<typeof createI18nStores> & { t: Readable<Translate> }

/**
 * Creates the app's i18n stores: the binding's locale/locales/setLocale stores
 * plus a `t` store whose function forwards the options argument.
 *
 * @returns i18n stores (`t`, `locale`, `locales`, `direction`, `setLocale`, …).
 * @throws When no i18n provider is bonded — wire it in `src/lib/bonds/`.
 */
export function createAppI18nStores(): AppI18nStores {
  const stores = createI18nStores()
  const provider = getProvider()
  if (!provider) {
    throw new Error(
      'createAppI18nStores: no i18n provider is bonded. Wire one in src/lib/bonds/ before rendering.',
    )
  }
  // Derived from the binding's own `t` store, so the function identity — and
  // every template that reads it — refreshes on locale/translation changes.
  const t = derived(
    stores.t,
    (): Translate =>
      (key: string, values?: InterpolationValues, options?: { defaultValue?: string }): string =>
        provider.t(key, values, options),
  )
  return { ...stores, t }
}
