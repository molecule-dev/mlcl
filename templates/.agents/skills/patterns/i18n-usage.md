---
id: i18n-usage
intent: i18n
title: Translate user-visible strings with t()
hooks: [useTranslation]
---

# i18n — every user-visible string goes through t()

**Why:** molecule flagship apps ship to 79 languages. Hardcoded English breaks localization. `t(key, values, { defaultValue })` returns the user's locale string, falling back to the English default inline.

```tsx
import { useTranslation } from '@molecule/app-react'

export function DashboardHeader() {
  const { t } = useTranslation()
  return (
    <header>
      <h1>
        {t('dashboard.welcome', { name: 'Sarah' }, { defaultValue: 'Welcome back, {{name}}' })}
      </h1>
      <button>{t('dashboard.newPost', {}, { defaultValue: 'New post' })}</button>
    </header>
  )
}
```

**Key key-naming conventions:**

- Dotted: `page.section.element` (e.g. `login.submit`, `posts.emptyState.title`)
- Values passed as object: `t('greet', { name })` → default template: `'Hello {{name}}'`
- Always provide `defaultValue` so English works without the translation file.

**Anti-patterns:**

- `<h1>Welcome back</h1>` — hardcoded. Always `{t('...', {}, { defaultValue: '...' })}`
- Don't build sentences via concatenation (`"Hello " + name`) — use placeholder syntax.
