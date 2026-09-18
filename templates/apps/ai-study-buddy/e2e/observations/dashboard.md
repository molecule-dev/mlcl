# Page observations: /dashboard (Dashboard)

Captured via `node scripts/observe-page.mjs ai-study-buddy /dashboard --auth`
against the live dev server (vite=3110, api=4110). Re-run any time to
refresh `_artifacts/dashboard.a11y.json` and `dashboard.png`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role      | expected behavior on interaction                | success signal                                         | failure signal                       |
| ------------------------------------------------------------- | --------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `getByRole('link', { name: 'Dashboard' })` (in sidebar)       | link      | navigates to `/dashboard`                       | URL ends with `/dashboard`, primary nav link is active | URL doesn't change                   |
| `getByRole('link', { name: 'Courses' })`                      | link      | navigates to `/courses`                         | URL becomes `/courses`, courses page shell renders     | stuck on `/dashboard`                |
| `getByRole('link', { name: 'Flashcards' })`                   | link      | navigates to `/flashcards`                      | URL becomes `/flashcards`                              | stays on `/dashboard`                |
| `getByRole('link', { name: 'Progress' })`                     | link      | navigates to `/progress`                        | URL becomes `/progress`                                | stays on `/dashboard`                |
| `getByRole('link', { name: 'Search' })`                       | link      | navigates to `/search`                          | URL becomes `/search`                                  | stays on `/dashboard`                |
| `getByRole('link', { name: 'Notifications' })`                | link      | navigates to `/notifications`                   | URL becomes `/notifications`                           | stays on `/dashboard`                |
| `getByRole('link', { name: 'Billing' })`                      | link      | navigates to `/billing`                         | URL becomes `/billing`                                 | stays on `/dashboard`                |
| `getByRole('link', { name: 'Profile' })`                      | link      | navigates to `/profile`                         | URL becomes `/profile`                                 | stays on `/dashboard`                |
| `getByRole('link', { name: 'Settings' })`                     | link      | navigates to `/settings`                        | URL becomes `/settings`                                | stays on `/dashboard`                |
| `getByRole('button', { name: 'Toggle theme' })`               | button    | toggles light/dark theme on `<html data-theme>` | classList swaps; persists in localStorage              | clicking does nothing                |
| `getByRole('button', { name: /Open user menu/ })`             | button    | opens user-menu popover with sign-out option    | popover visible                                        | popover not rendered                 |
| `getByRole('heading', { name: /Good (morning                  | afternoon | evening)/ })` (level 1)                         | heading                                                | static greeting reflects user's name | greeting includes signed-in name | shows generic placeholder |
| `getByRole('link', { name: /View all/ })` (Recommended study) | link      | navigates to `/courses`                         | URL becomes `/courses`                                 | stays on `/dashboard`                |
| `getByRole('link', { name: /Open decks/ })`                   | link      | navigates to `/flashcards`                      | URL becomes `/flashcards`                              | stays on `/dashboard`                |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside (selector / role / behavior)            |
| ----------------------------- | ------------- | ------------------------------------------------------- |
| Click `Open user menu` button | user popover  | `Sign out` button → clears auth + redirects to `/login` |

## Network calls expected during normal use

| trigger    | method | path             | what request body or query is expected            |
| ---------- | ------ | ---------------- | ------------------------------------------------- |
| page mount | GET    | `/api/profile`   | none — Bearer token in Authorization header       |
| page mount | GET    | `/api/dashboard` | none — Bearer token; returns kpis + insights JSON |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-dashboard.spec.ts`
