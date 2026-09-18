# Page observations: /docs/endpoints/:id (EndpointReference)

Source: live walk via Playwright + e2e/docs_endpoints__id.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role                        | expected behavior on interaction                            | success signal                                                                  | failure signal   |
| ----------------------------------------------- | --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
| `getByText(/Endpoint not found                  | Failed to load endpoint/i)` | text                                                        | on a bogus id, the not-found / load-error message renders (page does not crash) | message visible  | page blank |
| `getByRole("link", { name: /All endpoints/i })` | link                        | back-link navigates to /docs/endpoints                      | URL becomes /docs/endpoints                                                     | navigation fails |
| network                                         | request                     | visiting /docs/endpoints/<id> fires GET /api/endpoints/<id> | GET /api/endpoints/<id> appears in network capture                              | no request fires |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected              |
| ------- | ------ | --------------- | --------------------------------------------------- |
| mount   | GET    | /api/endpoints/ | 404 for unknown id is acceptable; client handles it |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_endpoints__id.spec.ts`
