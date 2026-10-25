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

A skeleton stands in for the list, so it REPLACES the list rather than joining
it: do not render placeholders inside the element that holds real items, and do
not give a placeholder the item's class, element shape or `:first-child`
position. A reader that counts the item class (a test, a person, an automation)
must never count a loading or empty node as data. When the list is already on
screen and only the next page or filter is loading, keep the rows visible (the
query cache's `keepPreviousData`) and put the status outside the list instead of
swapping the items for skeletons; while those rows belong to the previous key
(`isPreviousData`), show no empty state.

**Anti-patterns:**

- Don't block the whole page with a white screen — show a skeleton or spinner.
- Don't throw errors to console without rendering them — users need to know.
- Don't use a spinner on a list page — use a skeleton whose shape matches the card so the page doesn't jump when data arrives.
- Don't put a loading or empty placeholder inside the item list, or in a node that carries the item's contract class.
