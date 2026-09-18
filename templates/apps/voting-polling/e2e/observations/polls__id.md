# Page observations: /polls/:id (PollDetail)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction             | success signal                            | failure signal           |
| ------------------------------------------- | ------- | -------------------------------------------- | ----------------------------------------- | ------------------------ |
| `[data-test="polldetail-title"]`            | heading | render the poll title (canonical h1)         | visible                                   | absent                   |
| `getByRole("button", { name: /publish/i })` | button  | POST /api/polls/:id/publish (only on drafts) | status flips to active                    | 409 if already published |
| `getByRole("button", { name: /close/i })`   | button  | POST /api/polls/:id/close (only on active)   | status flips to closed + end_date stamped | 409 if draft/closed      |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                   | what request body or query is expected |
| ------------- | ------ | ---------------------- | -------------------------------------- |
| page load     | GET    | /api/polls/:id         | (returns single poll record)           |
| publish click | POST   | /api/polls/:id/publish | {}                                     |
| close click   | POST   | /api/polls/:id/close   | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/polls__id.spec.ts`
