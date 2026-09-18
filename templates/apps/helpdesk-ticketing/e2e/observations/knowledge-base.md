# Page observations: /knowledge-base (Knowledge base)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role           | expected behavior on interaction                    | success signal                                                                                          | failure signal              |
| ----------------------------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| `getByRole("heading").first()`                  | heading        | KB page heading paints                              | visible                                                                                                 | absent                      |
| article cards                                   | list           | list of articles fetched from /api/articles renders | cards visible (≥0 rows, no error)                                                                       | role=alert visible          |
| `getByRole("link", { name: /knowledge.*category | category/i })` | link                                                | category links resolve to /knowledge-base/category/:id (Navigate fallback redirects to /knowledge-base) | URL ends at /knowledge-base | unhandled 404 |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected |
| ------- | ------ | ------------- | -------------------------------------- |
| mount   | GET    | /api/articles | (none — list)                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/knowledge-base.spec.ts`
