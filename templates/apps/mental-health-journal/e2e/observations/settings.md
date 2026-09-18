# Page observations: /settings (Settings)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                     | success signal                             | failure signal |
| --------------------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------ | -------------- |
| `getByRole('heading', { level: 1, name: /^Settings$/i })` | heading | renders page title                                   | visible                                    | not rendered   |
| `getByTestId('privacy-toggle-cloud_backup')`              | button  | toggles cloud backup; PUT /api/journal/preferences   | aria-pressed flips, persisted on reload    | toast error    |
| `getByTestId('reminder-toggle')`                          | button  | toggles daily reminder; PUT /api/journal/preferences | aria-pressed flips                         | toast error    |
| `getByTestId('reminder-time-22:30')`                      | button  | sets reminder time to 22:30                          | aria-pressed=true                          | unchanged      |
| `getByTestId('theme-dark')`                               | button  | switches to dark theme; PUT /api/journal/preferences | aria-pressed=true, html dataset.theme=dark | unchanged      |
| `getByTestId('export-json')`                              | button  | GET /api/journal/export/json triggers download       | content-disposition received               | toast error    |
| `getByTestId('export-csv')`                               | button  | GET /api/journal/export/csv triggers download        | content-disposition received               | toast error    |
| `getByTestId('delete-account-open')`                      | button  | reveals delete confirmation panel                    | confirm button visible                     | unchanged      |

## Hidden surfaces opened from this page

| trigger                              | what it opens      | elements inside (selector / role / behavior)              |
| ------------------------------------ | ------------------ | --------------------------------------------------------- |
| `getByTestId('delete-account-open')` | confirmation panel | `delete-account-confirm` (final delete) and Cancel button |

## Network calls expected during normal use

| trigger                       | method | path                        | what request body or query is expected |
| ----------------------------- | ------ | --------------------------- | -------------------------------------- |
| Page load                     | GET    | /api/journal/preferences    | (no body)                              |
| Toggle privacy/reminder/theme | PUT    | /api/journal/preferences    | `{ privacy?, reminder?, theme? }`      |
| Click export                  | GET    | /api/journal/export/:format | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
