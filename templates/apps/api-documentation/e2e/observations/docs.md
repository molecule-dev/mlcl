# Page observations: /docs (DocsHome)

Source: live walk via Playwright + e2e/docs.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                            | success signal                                  | failure signal               |
| ----------------------------------------------------------------- | ------- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Getting started with the API/i })` | heading | docs landing renders after signup; GET /api/endpoints fires | heading visible + GET /api/endpoints in network | heading missing or GET fails |
| `getByRole("link", { name: /Browse all/i })`                      | link    | navigates to /docs/endpoints                                | URL becomes /docs/endpoints                     | navigation fails             |
| `getByRole("link", { name: /All guides/i })`                      | link    | navigates to /docs/guides                                   | URL becomes /docs/guides                        | navigation fails             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| initial load | GET    | /api/endpoints | 200 with array of endpoint summaries   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs.spec.ts`
