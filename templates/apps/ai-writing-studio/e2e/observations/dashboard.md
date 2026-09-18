# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                            | role       | expected behavior on interaction                                                                              | success signal                                                                         | failure signal                       |
| ------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| `getByRole('heading', { name: /Good (morning\|afternoon\|evening), .+/i, level: 1 })` | heading    | renders greeting with the writer's first name                                                                 | h1 contains the user's first name                                                      | h1 missing                           |
| `getByRole('link', { name: /Start a new document/i }).first()`                        | link       | navigates to `/documents/new`, which redirects to `/documents/<new-id>`                                       | URL matches `/documents/<uuid>` after redirect; new row exists in `GET /api/documents` | URL stays at `/documents/new` or 404 |
| `getByRole('heading', { name: /A page a day keeps the muse engaged/i })`              | heading    | renders WritingStreakHeroCard headline                                                                        | h2 visible                                                                             | hero card missing                    |
| `getByText(/Total documents/i)`                                                       | text       | total-documents KPI tile renders                                                                              | Tile + numeric value (default 0 for fresh user)                                        | tile missing                         |
| `getByText(/^Published$/i).first()`                                                   | text       | published-this-month KPI renders                                                                              | Tile + numeric value                                                                   | tile missing                         |
| `getByText(/Avg SEO score/i)`                                                         | text       | avg SEO score KPI renders with "/100" suffix                                                                  | Tile + value/100                                                                       | tile missing                         |
| `getByText(/AI words used/i)`                                                         | text       | AI words used KPI renders with limit suffix                                                                   | Tile + value/limit                                                                     | tile missing                         |
| `getByRole('heading', { name: /Continue writing/i })`                                 | heading    | continue-writing section heading                                                                              | h2 visible                                                                             | section missing                      |
| `getByRole('link', { name: /^View all$/i })`                                          | link       | navigates to `/documents`                                                                                     | URL becomes `/documents`                                                               | URL unchanged                        |
| `getByRole('link', { name: /Create document/i })`                                     | link       | empty-state CTA navigates to `/documents/new`                                                                 | URL contains `/documents/` and a real id                                               | URL unchanged or 404                 |
| `getByRole('heading', { name: /\d+-day streak/i, level: 3 })`                         | heading    | streak card renders user's day-streak count (0 for new user)                                                  | h3 visible with day-streak number                                                      | streak card missing                  |
| `nav 'Primary navigation'`                                                            | navigation | sidebar lists 8 page links (Dashboard/Documents/Templates/Image Generator/Analytics/Profile/Billing/Settings) | each link is visible and routes correctly                                              | sidebar broken                       |
| `getByRole('button', { name: /Toggle theme/i })`                                      | button     | toggles `<html data-theme>` between light/dark and persists across reload                                     | `data-theme` flipped, persisted in `localStorage` and after `page.reload()`            | theme unchanged or doesn't persist   |

## Hidden surfaces opened from this page

| trigger         | what it opens        | elements inside (selector / role / behavior)                                    |
| --------------- | -------------------- | ------------------------------------------------------------------------------- |
| (sidebar links) | navigates within app | each link's `href` is documented in INVENTORY.md and exercised by sibling specs |

## Network calls expected during normal use

| trigger                    | method | path           | what request body or query is expected                                  |
| -------------------------- | ------ | -------------- | ----------------------------------------------------------------------- |
| initial render             | GET    | /api/dashboard | returns `{ kpis, streak, recentDocuments }` for the authed user         |
| Start a new document click | POST   | /api/documents | empty draft body → 201 with `{ id }`; UI redirects to `/documents/<id>` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
