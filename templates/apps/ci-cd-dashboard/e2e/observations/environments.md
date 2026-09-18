# Page observations: /environments (Environments)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role        | expected behavior on interaction         | success signal                  | failure signal   |
| ------------------------------------------------------------- | ----------- | ---------------------------------------- | ------------------------------- | ---------------- |
| `getByRole('heading', { name: /^Environments$/i, level: 1 })` | heading     | renders page title                       | heading visible                 | absent           |
| environment card                                              | article     | shows env name + health pill + traffic % | card visible with each datum    | absent           |
| URL link `a[href^="https://"]`                                | link        | links to environment URL                 | link with href attribute        | no href          |
| Current deploy + Recent deploys                               | text + list | shows current SHA + history rows         | text + ≥1 listitem visible      | empty            |
| POST /api/environments/:id/deploy (backend invariant)         | API         | records new deploy onto env              | recent_deploys grows after POST | POST status ≥400 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger             | method | path                         | what request body or query is expected |
| ------------------- | ------ | ---------------------------- | -------------------------------------- |
| Page load           | GET    | /api/environments            | none                                   |
| Backend deploy POST | POST   | /api/environments/:id/deploy | { sha, branch, status }                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/environments.spec.ts`
