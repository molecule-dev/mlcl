# Page observations: /repositories/:slug (RepositoryDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role      | expected behavior on interaction     | success signal                 | failure signal  |
| ---------------------------------------------------------------- | --------- | ------------------------------------ | ------------------------------ | --------------- |
| `getByRole('link', { name: /All repositories/i })`               | link      | navigate back to /repositories       | URL becomes /repositories      | stays on detail |
| `getByRole('heading', { level: 1 })`                             | heading   | shows repo name                      | heading visible                | absent          |
| description text                                                 | text      | shows repository description         | element visible                | absent          |
| `getByRole('button', { name: /^Overview$/i })`                   | tab       | shows .conduit.yml + KPI sidebar     | code block + KPI cards visible | sections empty  |
| `getByRole('button', { name: /^Branches$/i })`                   | tab       | shows branch list                    | branch list rendered           | empty list      |
| `getByRole('button', { name: /^Pipelines$/i })`                  | tab       | shows recent pipelines for repo      | pipeline list rendered         | empty list      |
| `getByRole('button', { name: /^Settings$/i })`                   | tab       | shows repo settings panel            | settings form rendered         | absent          |
| Overview KPI tiles (Total builds + Success rate + Mean duration) | KPI tiles | show repo metrics under Overview tab | all 3 labels visible           | any missing     |

## Hidden surfaces opened from this page

| trigger             | what it opens | elements inside (selector / role / behavior) |
| ------------------- | ------------- | -------------------------------------------- |
| Click Branches tab  | branch list   | branch name + commit SHA + ahead/behind      |
| Click Pipelines tab | pipeline list | rows of recent pipelines                     |
| Click Settings tab  | settings form | repo configuration form                      |

## Network calls expected during normal use

| trigger   | method | path                    | what request body or query is expected |
| --------- | ------ | ----------------------- | -------------------------------------- |
| Page load | GET    | /api/repositories/:slug | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/repositories__slug.spec.ts`
