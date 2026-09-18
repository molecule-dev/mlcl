# Page observations: /home (Home)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/home.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role | expected behavior on interaction                              | success signal                | failure signal                  |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| `getByText(/How a film label fell in love/i).first()` | text | seeded video title is rendered (real DB row, not placeholder) | text visible                  | placeholder text                |
| `getByText(/Lina Reyes/i).first()`                    | text | seeded channel name is rendered alongside its video           | text visible                  | undefined / `null`              |
| `locator('a[href="/watch/<seeded-uuid>"]').first()`   | link | video card opens /watch/:id for a seeded UUID                 | URL becomes /watch/:id        | href is `v-1` style placeholder |
| `locator('main')`                                     | main | grid renders MM:SS duration text from real `duration_seconds` | match for `\d+:\d{2}` visible | only `0:00` strings             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected                          |
| ------- | ------ | ----------- | --------------------------------------------------------------- |
| Mount   | GET    | /api/videos | array of enriched rows with `channel_name` + `duration_seconds` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-home.spec.ts`
