import type { CommonTranslations } from '@molecule/app-locales-common'

/**
 * App-specific UI translation keys.
 *
 * Loose `Record<string, string>` allows app-specific keys without enumerating
 * each one — after Phase B's per-package locale bond rollout, most strings are
 * provided by the bonds (auto-merged via setupI18nDefault's packageLocales),
 * so per-app ui.ts files only need to declare truly app-unique keys.
 */
export type UiTranslations = Partial<CommonTranslations> & Record<string, string>
