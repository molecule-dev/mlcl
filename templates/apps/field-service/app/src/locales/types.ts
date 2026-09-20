import type { CommonTranslations } from '@molecule/app-locales-common'

/**
 * App-specific UI translation keys.
 *
 * Loose `Record<string, string>` allows app-specific keys without enumerating
 * each one. Apps that want stricter type-checking can replace this with an
 * explicit `Partial<CommonTranslations> & { ... }` declaration listing every
 * key (see the `blog` flagship for an example).
 */
export type UiTranslations = Partial<CommonTranslations> & Record<string, string>
