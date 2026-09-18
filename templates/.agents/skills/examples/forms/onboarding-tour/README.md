---
name: onboarding-tour
intent: |
  - "Product tour"
  - "Onboarding tour with tooltips"
  - "Walk new users through the UI"
  - "Highlight features step-by-step"
  - "Coach marks"
keywords: [tour, onboarding, walkthrough, tooltip, coach, highlight]
---

# Product tour (interactive coach marks for new users)

**When to copy this example:** the user wants a first-time tour
that walks new users through key features with tooltips that
highlight specific buttons. Different from
`forms/multi-step-wizard/` (which is a forced multi-step form).

## What you'll install

No additional `@molecule` packages are required. The tour is implemented as a
plain React component using only:

- `@molecule/app-ui` — `getClassMap()` for all styling
- `@molecule/app-i18n-react-i18next` — `useTranslation()` for all copy

There is no `@molecule/app-tour-driver` package. Do not install one. If you
need pointer-arrow coach marks (highlighting a specific DOM element), add
`driver.js` (MIT, zero dependencies) directly:

```bash
cd /workspace
npm install driver.js --workspace=app
```

Then wrap it in a `useEffect` inside `ProductTour.tsx` — see the driver.js
docs for `driver.highlight()`. The `data-tour="*"` attribute selectors in
this example are designed to work with any such library.

## Files in this example

| Path                             | What it does                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/ProductTour.tsx` | Defines steps with selectors + copy. Reads `tour_completed` from `/me`; if false, runs on next page load.                                                   |
| `api/handlers/me.ts`             | `GET /me` returns the current user (incl. `tour_completed_at`); `PATCH /me { tour_completed_at }` — called when the user finishes or skips. Session-scoped. |

## Anti-patterns

- Do not block the first-time UX with a tour the user can't skip.
  Always show a Skip button.
- Do not rely on CSS selectors that change with restyles. Use
  `data-tour="step-name"` attributes you add to the components.
- Do not invent or import `@molecule/app-tour-driver` or
  `@molecule/app-product-tour` — these packages do not exist.
  Use the plain React component in this example; add `driver.js`
  directly if you need DOM-anchored pointer arrows.
- Do not run the tour every visit — set a per-user `tour_completed`
  flag (or `tour_completed_at` timestamp).
- Do not put core functionality behind the tour. If a feature
  _requires_ the tour, the UI is broken.

## Verify

New user signs up → first dashboard load → tour highlights nav,
search, primary CTA → user clicks Done → revisits dashboard → no
tour. Click Skip on first step → tour ends, doesn't run again.
