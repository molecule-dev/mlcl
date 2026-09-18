# Page observations: /artifacts (Artifacts)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                        | success signal                        | failure signal |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------- | ------------------------------------- | -------------- |
| `getByRole('heading', { name: /^Artifacts$/i, level: 1 })` | heading | renders page title                                      | heading visible                       | absent         |
| artifact name text                                         | text    | shows artifact filename                                 | element visible                       | absent         |
| artifact metadata                                          | text    | shows repo · branch · age                               | element visible                       | absent         |
| artifact type badge                                        | text    | shows artifact type (sourcemap/log/tarball/sbom/docker) | element visible                       | absent         |
| artifact size text                                         | text    | shows file size                                         | element visible                       | absent         |
| retention text                                             | text    | shows retention period                                  | element visible                       | absent         |
| `getByRole('link', { name: /Download/i })` first           | link    | navigates to /api/artifacts/:id/download                | link href starts with /api/artifacts/ | href missing   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path                        | what request body or query is expected |
| -------------- | ------ | --------------------------- | -------------------------------------- |
| Page load      | GET    | /api/artifacts              | none                                   |
| Click Download | GET    | /api/artifacts/:id/download | none — server returns binary content   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/artifacts.spec.ts`
