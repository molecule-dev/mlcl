# Page observations: /repositories (Repositories)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role            | expected behavior on interaction | success signal                     | failure signal         |
| ------------------------------------------------------------- | --------------- | -------------------------------- | ---------------------------------- | ---------------------- |
| `getByRole('heading', { name: /^Repositories$/i, level: 1 })` | heading         | renders page title               | heading visible                    | absent                 |
| `a[href^="/repositories/"]`                                   | link (repo row) | navigates to repo detail         | URL becomes /repositories/:slug    | stays on /repositories |
| repo name text                                                | text            | shows repository name            | text visible (e.g. "frontend-app") | absent                 |
| repo language + branch text                                   | text            | shows e.g. "TypeScript · main"   | element visible                    | absent                 |
| status text (queued/running/passed/failed)                    | text            | shows latest pipeline status     | text visible per row               | absent                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path              | what request body or query is expected |
| --------- | ------ | ----------------- | -------------------------------------- |
| Page load | GET    | /api/repositories | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/repositories.spec.ts`
