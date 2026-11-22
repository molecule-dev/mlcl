---
name: i18n
description: Internationalization patterns for API and App. Translation functions, key naming, locale bonds, error key forwarding.
---

# Internationalization (i18n)

## App-Side (React)

```tsx
import { useTranslation } from '@molecule/app-react'

function MyComponent(): JSX.Element {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('todos.title', undefined, { defaultValue: 'My Todos' })}</h1>
      <p>{t('todos.empty', undefined, { defaultValue: 'No todos yet.' })}</p>
      <button>{t('todos.add', undefined, { defaultValue: 'Add Todo' })}</button>
    </div>
  )
}
```

### t() Signature

```typescript
t(key: string, values?: Record<string, string>, options?: { defaultValue: string }): string
```

- `key` — dot-notation translation key
- `values` — interpolation values (e.g. `{ name: 'John' }` for `'Hello {{name}}'`)
- `defaultValue` — English fallback shown when no translation exists

**Always provide a `defaultValue`.** This ensures the app works even without translation files.

**Interpolation tokens use DOUBLE braces `{{var}}` — never single `{var}`.** Both the
`defaultValue` AND any matching entry in a locale file (`locales/{code}/ui.ts`) must use
`{{name}}`. A single-brace `{name}` is NOT interpolated — it renders LITERALLY on the
page as the text "{name}". This is the most common i18n bug: if you also add/edit a
locale entry for the key, write `'Welcome, {{name}}'` there too (the locale entry takes
priority over `defaultValue`, so a single-brace locale entry shows `{name}` even when the
default is correct).

```typescript
// ✅ correct — interpolated
t('hero.title', { tagline: APP_TAGLINE }, { defaultValue: 'Eat well — {{tagline}}' })
// locale entry (locales/en/ui.ts): heroTitle: 'Eat well — {{tagline}}'

// ❌ wrong — renders literally as "Eat well — {tagline}"
// defaultValue: 'Eat well — {tagline}'   /  locale entry: 'Eat well — {tagline}'
```

### What to Translate

ALL user-visible text must use `t()`:

- Button labels, headings, form placeholders
- `aria-label` attributes
- Loading/saving indicators
- Modal titles, error messages
- Empty state messages

## API-Side

```typescript
import { t } from '@molecule/api-i18n'

// Error responses — return both text and key
const key = 'todo.error.notFound'
res.status(404).json({ error: t(key), errorKey: key })
```

The app translates `errorKey` client-side using the user's locale.

### Locale-Aware Content

For emails and notifications (sent directly to users), use per-request locale:

```typescript
const subject = t('email.resetSubject', { appName }, { locale: user.locale || 'en' })
```

## Key Naming Convention

Use dot-notation: `scope.component.element`

```
todos.title           # Todos page title
todos.add             # Add button
todos.empty           # Empty state message
auth.login.email      # Login page, email field
settings.billing      # Settings page, billing section
common.loading        # Shared across pages
common.save           # Shared save button
common.cancel         # Shared cancel button
```

## Error Key Forwarding

API returns both human-readable text and a translation key:

```typescript
// API handler
res.status(404).json({
  error: t('todo.error.notFound'), // English text for fallback
  errorKey: 'todo.error.notFound', // Key for client-side translation
})

// App component
const { t } = useTranslation()
if (error.errorKey) {
  showError(t(error.errorKey, undefined, { defaultValue: error.error }))
}
```

## Locale Bonds

Translations are provided by companion locale bond packages:

- `@molecule/app-locales-forms` — form validation messages
- `@molecule/api-locales-user` — user resource messages

These are auto-wired in the project's bonds/ directory. You don't need to set them up manually.

## Adding Your Own Translations

Project-specific translations live in `app/src/locales/<code>/ui.ts`, which each
export a `ui` object. The English file (`app/src/locales/en/ui.ts`) is already
wired into the i18n provider — you do NOT register translations yourself, and
there is NO `provider.addTranslations(...)` call. Just add your keys to the
existing `ui` object (flat dot-notation keys, matching the keys you pass to
`t()`):

```typescript
// app/src/locales/en/ui.ts
import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  'todos.title': 'My Todos',
  'todos.add': 'Add Todo',
  'todos.empty': 'No todos yet. Create one!',
  'todos.placeholder': 'What needs to be done?',
}
```

**`app/src/locales/types.ts` needs no change to add keys.** `UiTranslations` is intentionally LOOSE
(`Partial<CommonTranslations> & Record<string, string>`) — it already accepts any
app-specific key. A strict type that enumerates every key forces all ~79
`<code>/ui.ts` locale files to define every key, so every other locale fails the build
with "missing properties from type UiTranslations". Add your keys to the `ui` objects.

To translate into another language, add the same keys to that locale's
`app/src/locales/<code>/ui.ts` (e.g. `app/src/locales/es/ui.ts`). The provider
lazy-loads each locale's `ui.ts` on demand — no extra wiring needed.

Because every `t()` call already passes a `defaultValue` (English fallback),
adding keys to `ui.ts` is optional polish — the app works without it. The
wiring lives in `app/src/bonds/i18n-default.ts` (`setupI18nProvider({ enUi, ... })`
from `@molecule/app-i18n-default-react`); adding keys needs no change there.
