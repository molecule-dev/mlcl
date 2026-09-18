# Page observations: search

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the `/search` page and the `/api/tasks/search` backend filter.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                             | role          | expected behavior on interaction                                | success signal                                    | failure signal                                 |
| ---------------------------------------------------------------------- | ------------- | --------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `getByText(/start typing                                               | search.*tasks | find your tasks/i)`on`/search` (idle state)                     | text                                              | Idle prompt shown when no query has been typed | Visible within 15s on a fresh account | Idle copy missing |
| `getByRole('searchbox')` / `getByRole('textbox', { name: /search/i })` | textbox       | Typing a matching query surfaces it via GET `/api/tasks/search` | Matching task title visible within 5s of debounce | No matching row                                |
| GET `/api/tasks/search?q=` returns an empty array on an empty query    | route         | Server-side guard on empty queries                              | `200`, `[]`                                       | non-empty array or 4xx                         |

## Hidden surfaces opened from this page

| trigger                  | what it opens      | elements inside (selector / role / behavior) |
| ------------------------ | ------------------ | -------------------------------------------- |
| Type into the search box | inline result list | per-task rows linking to `/tasks/:id`        |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected |
| ----------- | ------ | --------------------- | -------------------------------------- |
| Type query  | GET    | /api/tasks/search?q=… | → 200 array of matching tasks          |
| Empty query | GET    | /api/tasks/search?q=  | → 200 `[]`                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-search.spec.ts`
