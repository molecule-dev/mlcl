/**
 * Default i18n bond setup
 *
 * Uses the built-in createSimpleI18nProvider from @molecule/app-i18n.
 * Swap to a different i18n provider by replacing this bond.
 */

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ui as en } from '../locales/en/ui.js'

const lazyLocale = (code: string) => () =>
  import(`../locales/${code}/ui.ts`).then((m: { ui: Record<string, string> }) => m.ui)

export const i18nProvider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr' as const, translations: en },
  { code: 'af', name: 'Afrikaans', direction: 'ltr' as const, loader: lazyLocale('af') },
  { code: 'am', name: 'አማርኛ', direction: 'ltr' as const, loader: lazyLocale('am') },
  { code: 'ar', name: 'العربية', direction: 'rtl' as const, loader: lazyLocale('ar') },
  { code: 'az', name: 'Azərbaycan', direction: 'ltr' as const, loader: lazyLocale('az') },
  { code: 'bg', name: 'Български', direction: 'ltr' as const, loader: lazyLocale('bg') },
  { code: 'bn', name: 'বাংলা', direction: 'ltr' as const, loader: lazyLocale('bn') },
  { code: 'bs', name: 'Bosanski', direction: 'ltr' as const, loader: lazyLocale('bs') },
  { code: 'ca', name: 'Català', direction: 'ltr' as const, loader: lazyLocale('ca') },
  { code: 'cs', name: 'Čeština', direction: 'ltr' as const, loader: lazyLocale('cs') },
  { code: 'cy', name: 'Cymraeg', direction: 'ltr' as const, loader: lazyLocale('cy') },
  { code: 'da', name: 'Dansk', direction: 'ltr' as const, loader: lazyLocale('da') },
  { code: 'de', name: 'Deutsch', direction: 'ltr' as const, loader: lazyLocale('de') },
  { code: 'el', name: 'Ελληνικά', direction: 'ltr' as const, loader: lazyLocale('el') },
  { code: 'es', name: 'Español', direction: 'ltr' as const, loader: lazyLocale('es') },
  { code: 'et', name: 'Eesti', direction: 'ltr' as const, loader: lazyLocale('et') },
  { code: 'eu', name: 'Euskara', direction: 'ltr' as const, loader: lazyLocale('eu') },
  { code: 'fa', name: 'فارسی', direction: 'rtl' as const, loader: lazyLocale('fa') },
  { code: 'fi', name: 'Suomi', direction: 'ltr' as const, loader: lazyLocale('fi') },
  { code: 'fil', name: 'Filipino', direction: 'ltr' as const, loader: lazyLocale('fil') },
  { code: 'fr', name: 'Français', direction: 'ltr' as const, loader: lazyLocale('fr') },
  { code: 'ga', name: 'Gaeilge', direction: 'ltr' as const, loader: lazyLocale('ga') },
  { code: 'gl', name: 'Galego', direction: 'ltr' as const, loader: lazyLocale('gl') },
  { code: 'gu', name: 'ગુજરાતી', direction: 'ltr' as const, loader: lazyLocale('gu') },
  { code: 'he', name: 'עברית', direction: 'rtl' as const, loader: lazyLocale('he') },
  { code: 'hi', name: 'हिन्दी', direction: 'ltr' as const, loader: lazyLocale('hi') },
  { code: 'hr', name: 'Hrvatski', direction: 'ltr' as const, loader: lazyLocale('hr') },
  { code: 'hu', name: 'Magyar', direction: 'ltr' as const, loader: lazyLocale('hu') },
  { code: 'hy', name: 'Հայերեն', direction: 'ltr' as const, loader: lazyLocale('hy') },
  { code: 'id', name: 'Bahasa Indonesia', direction: 'ltr' as const, loader: lazyLocale('id') },
  { code: 'is', name: 'Íslenska', direction: 'ltr' as const, loader: lazyLocale('is') },
  { code: 'it', name: 'Italiano', direction: 'ltr' as const, loader: lazyLocale('it') },
  { code: 'ja', name: '日本語', direction: 'ltr' as const, loader: lazyLocale('ja') },
  { code: 'ka', name: 'ქართული', direction: 'ltr' as const, loader: lazyLocale('ka') },
  { code: 'kk', name: 'Қазақша', direction: 'ltr' as const, loader: lazyLocale('kk') },
  { code: 'km', name: 'ខ្មែរ', direction: 'ltr' as const, loader: lazyLocale('km') },
  { code: 'kn', name: 'ಕನ್ನಡ', direction: 'ltr' as const, loader: lazyLocale('kn') },
  { code: 'ko', name: '한국어', direction: 'ltr' as const, loader: lazyLocale('ko') },
  { code: 'lo', name: 'ລາວ', direction: 'ltr' as const, loader: lazyLocale('lo') },
  { code: 'lt', name: 'Lietuvių', direction: 'ltr' as const, loader: lazyLocale('lt') },
  { code: 'lv', name: 'Latviešu', direction: 'ltr' as const, loader: lazyLocale('lv') },
  { code: 'mk', name: 'Македонски', direction: 'ltr' as const, loader: lazyLocale('mk') },
  { code: 'ml', name: 'മലയാളം', direction: 'ltr' as const, loader: lazyLocale('ml') },
  { code: 'mn', name: 'Монгол', direction: 'ltr' as const, loader: lazyLocale('mn') },
  { code: 'mr', name: 'मराठी', direction: 'ltr' as const, loader: lazyLocale('mr') },
  { code: 'ms', name: 'Bahasa Melayu', direction: 'ltr' as const, loader: lazyLocale('ms') },
  { code: 'mt', name: 'Malti', direction: 'ltr' as const, loader: lazyLocale('mt') },
  { code: 'my', name: 'မြန်မာ', direction: 'ltr' as const, loader: lazyLocale('my') },
  { code: 'nb', name: 'Norsk bokmål', direction: 'ltr' as const, loader: lazyLocale('nb') },
  { code: 'ne', name: 'नेपाली', direction: 'ltr' as const, loader: lazyLocale('ne') },
  { code: 'nl', name: 'Nederlands', direction: 'ltr' as const, loader: lazyLocale('nl') },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', direction: 'ltr' as const, loader: lazyLocale('pa') },
  { code: 'pl', name: 'Polski', direction: 'ltr' as const, loader: lazyLocale('pl') },
  { code: 'pt', name: 'Português', direction: 'ltr' as const, loader: lazyLocale('pt') },
  { code: 'ro', name: 'Română', direction: 'ltr' as const, loader: lazyLocale('ro') },
  { code: 'ru', name: 'Русский', direction: 'ltr' as const, loader: lazyLocale('ru') },
  { code: 'si', name: 'සිංහල', direction: 'ltr' as const, loader: lazyLocale('si') },
  { code: 'sk', name: 'Slovenčina', direction: 'ltr' as const, loader: lazyLocale('sk') },
  { code: 'sl', name: 'Slovenščina', direction: 'ltr' as const, loader: lazyLocale('sl') },
  { code: 'sq', name: 'Shqip', direction: 'ltr' as const, loader: lazyLocale('sq') },
  { code: 'sr', name: 'Српски', direction: 'ltr' as const, loader: lazyLocale('sr') },
  { code: 'sv', name: 'Svenska', direction: 'ltr' as const, loader: lazyLocale('sv') },
  { code: 'sw', name: 'Kiswahili', direction: 'ltr' as const, loader: lazyLocale('sw') },
  { code: 'ta', name: 'தமிழ்', direction: 'ltr' as const, loader: lazyLocale('ta') },
  { code: 'te', name: 'తెలుగు', direction: 'ltr' as const, loader: lazyLocale('te') },
  { code: 'th', name: 'ไทย', direction: 'ltr' as const, loader: lazyLocale('th') },
  { code: 'tr', name: 'Türkçe', direction: 'ltr' as const, loader: lazyLocale('tr') },
  { code: 'uk', name: 'Українська', direction: 'ltr' as const, loader: lazyLocale('uk') },
  { code: 'ur', name: 'اردو', direction: 'rtl' as const, loader: lazyLocale('ur') },
  { code: 'uz', name: 'Oʻzbek', direction: 'ltr' as const, loader: lazyLocale('uz') },
  { code: 'vi', name: 'Tiếng Việt', direction: 'ltr' as const, loader: lazyLocale('vi') },
  { code: 'zh', name: '中文', direction: 'ltr' as const, loader: lazyLocale('zh') },
  { code: 'zh-TW', name: '繁體中文', direction: 'ltr' as const, loader: lazyLocale('zh-TW') },
  { code: 'zu', name: 'isiZulu', direction: 'ltr' as const, loader: lazyLocale('zu') },
])

export function setupI18nDefault(): void {
  setProvider(i18nProvider)

  // Persist locale selection through the bonded storage provider.
  //
  // The import is dynamic for ORDERING, not optionality — the storage core is
  // alwaysInclude, so it ships in every generated app. Deferring by a microtask
  // makes this wiring run after EVERY setup*() call in bonds/index.ts; the i18n
  // bond is set up before the storage bond, so a static import + a direct get()
  // here would throw "no storage provider bonded" and locale restore would break.
  // Bundlers report this as INEFFECTIVE_DYNAMIC_IMPORT — that warning is expected.
  import('@molecule/app-storage')
    .then(({ get, set }) => {
      i18nProvider.onLocaleChange((locale: string) => set('molecule-locale', locale))
      get<string>('molecule-locale').then((saved: string | null) => {
        if (saved && saved !== i18nProvider.getLocale()) {
          i18nProvider.setLocale(saved).catch(() => {
            // The saved locale is no longer registered (pruned as unsupported, or
            // dropped in an app update) — keep the default locale instead of
            // surfacing an unhandled rejection on every boot.
          })
        }
      })
    })
    .catch(() => {
      // No storage provider bonded (or the wiring above threw) — locale
      // persistence is skipped and the default locale still applies.
    })
}
