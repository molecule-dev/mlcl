---
id: loading-error-states
intent: ui-state
title: Loading + error UI states
hooks: [useState, getClassMap]
---

# Loading + error UI (with skeleton)

**When to use:** every page that fetches data or submits a form. Users need feedback during the wait and on failure.

```tsx
const { t } = useTranslation()
const cm = getClassMap()

if (loading) {
  return (
    <div
      data-mol-id="loading"
      className={cm.flex({ align: 'center', justify: 'center' })}
      style={{ minHeight: 240 }}
    >
      <div
        className={cm.spinner({ size: 'lg' })}
        aria-label={t('loading', {}, { defaultValue: 'Loading' })}
      />
    </div>
  )
}

if (error) {
  return (
    <div data-mol-id="error" role="alert" className={cm.alert({ variant: 'error' })}>
      <p className={cm.alertTitle}>
        {t('error.title', {}, { defaultValue: 'Something went wrong' })}
      </p>
      <p>{error}</p>
      <button onClick={retry} className={cm.button({ variant: 'outline' })}>
        {t('error.retry', {}, { defaultValue: 'Try again' })}
      </button>
    </div>
  )
}
```

**Skeleton** — prefer this over a plain "Loading…" message for list pages. Render N placeholder cards matching the real card's outer dimensions so the layout doesn't shift once data arrives:

```tsx
if (loading) {
  return (
    <ul>
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          aria-hidden="true"
          className={cm.cn(cm.skeleton(), cm.sp('my', 3))}
          style={{ minHeight: 120 }}
        />
      ))}
    </ul>
  )
}
```

**Anti-patterns:**

- Don't block the whole page with a white screen — show a skeleton or spinner.
- Don't throw errors to console without rendering them — users need to know.
- Don't use a spinner on a list page — use a skeleton whose shape matches the card so the page doesn't jump when data arrives.
