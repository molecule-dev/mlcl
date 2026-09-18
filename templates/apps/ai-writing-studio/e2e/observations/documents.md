# Page observations: /documents (Documents)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role      | expected behavior on interaction                                        | success signal                                                       | failure signal                       |
| ------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `getByRole('heading', { name: /^Documents$/i, level: 1 })`          | heading   | page title renders                                                      | h1 visible                                                           | h1 missing                           |
| `getByRole('link', { name: /New document/i })`                      | link      | navigates to `/documents/new`, which redirects to `/documents/<new-id>` | URL becomes `/documents/<uuid>`; new row in `GET /api/documents`     | URL stays at /documents/new          |
| `getByRole('button', { name: /^All$/i, exact: false })` (filter)    | button    | filters list to all statuses; bumps "Filter applied" counter            | `aria-pressed=true` on All chip; counter visible                     | aria-pressed unchanged               |
| `getByRole('button', { name: /^Drafts$/i })`                        | button    | filters to drafts only                                                  | `aria-pressed=true` on Drafts; list filtered                         | aria-pressed unchanged               |
| `getByRole('button', { name: /^Published$/i })`                     | button    | filters to published only                                               | `aria-pressed=true` on Published; list filtered or shows empty-state | aria-pressed unchanged               |
| `getByRole('button', { name: /AI assisted/i })`                     | button    | filters to AI-assisted                                                  | `aria-pressed=true`; list filtered                                   | aria-pressed unchanged               |
| `getByRole('button', { name: /^Archived$/i })`                      | button    | filters to archived                                                     | `aria-pressed=true`; list filtered or shows empty-state              | aria-pressed unchanged               |
| `getByRole('searchbox', { name: /Search documents/i })`             | searchbox | filters list by title substring (case-insensitive)                      | as user types, only matching docs remain                             | input not editable or list unchanged |
| `getByRole('link', { name: /Create new document/i })` (empty-state) | link      | empty-state CTA navigates to `/documents/new`                           | URL becomes `/documents/<uuid>`                                      | URL unchanged                        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path           | what request body or query is expected             |
| ------------------ | ------ | -------------- | -------------------------------------------------- |
| initial render     | GET    | /api/documents | returns array of document rows for the authed user |
| New document click | POST   | /api/documents | empty draft body → 201 with `{ id }`               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents.spec.ts`
