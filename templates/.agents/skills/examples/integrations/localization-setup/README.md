---
name: localization-setup
intent: |
  - "Internationalization / i18n"
  - "Translate my app into multiple languages"
  - "Language switcher"
  - "Localize for [region]"
  - "Multi-language support"
keywords: [i18n, l10n, localization, translation, language, locale]
---

# Localization setup (whole-app i18n with language switcher)

**When to copy this example:** the user wants the entire app
translated into multiple languages with a switcher. Every text in
the app should already use `t()` calls — this example is about
wiring the locale layer so those calls actually translate.

## What you'll install

```bash
cd /workspace
# API: i18n bond provider
npm install @molecule/api-i18n-simple --workspace=api

# App: i18n default setup (lazy-loading + 79-language support)
npm install @molecule/app-i18n-default-react --workspace=app

# Companion locale bonds — one per @molecule/app-* feature package your app uses.
# Each companion bond ships ALL 79 languages automatically.
# There are no per-language packages (@molecule/api-locales-en etc. do NOT exist).
npm install @molecule/app-locales-auth @molecule/app-locales-forms @molecule/app-locales-ui --workspace=app
# Add more as needed, e.g.:
#   npm install @molecule/api-locales-user @molecule/api-locales-emails --workspace=api
#   npm install @molecule/app-locales-routing @molecule/app-locales-icons --workspace=app
```

## Files in this example

| Path                                  | What it does                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `api/bonds/i18n-simple.ts`            | Wires the i18n bond + registers locale bonds.                                                 |
| `app/bonds/i18n-react-i18next.ts`     | Same on the frontend.                                                                         |
| `app/components/LanguageSwitcher.tsx` | Dropdown of available locales; on change, calls `setLocale(code)` and persists to user prefs. |

## Anti-patterns

- Do not hardcode strings ANYWHERE in the app. Every visible string
  must be `t('key', vars, { defaultValue: 'English fallback' })`.
- Do not invent `@molecule/api-i18n-i18next` or
  `@molecule/app-react-i18n` — the packages are
  `@molecule/api-i18n-simple` (API bond) + `@molecule/app-i18n-default-react` (app bond).
- Do NOT use per-language packages. `@molecule/api-locales-en`,
  `@molecule/api-locales-es`, `@molecule/api-locales-fr`, etc. do NOT exist.
  Locale bonds are per-feature (e.g. `@molecule/app-locales-auth`,
  `@molecule/api-locales-user`) and each ships all 79 languages automatically.
- Do not store translations inside feature packages. Use
  companion locale bonds (`@molecule/{stack}-locales-{name}`).
- Do not forget RTL (Arabic, Hebrew). Add `dir="rtl"` on the
  document root when an RTL locale is active.
- Do not detect user locale on the server only. Combine
  `Accept-Language` header + a saved user preference + a cookie.
- Do not auto-translate via Google Translate API at runtime.
  Latency, quality, cost. Translate at build time / by humans.

## Verify

Visit site in Spanish browser → app loads in Spanish without a
manual switch. Open language switcher → pick French → UI updates
without page reload. Refresh → language persists.
