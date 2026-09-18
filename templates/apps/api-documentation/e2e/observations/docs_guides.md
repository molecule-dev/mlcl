# Page observations: /docs/guides (Guides)

Source: live walk via Playwright + e2e/docs_guides.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                        | success signal                           | failure signal               |
| ------------------------------------------------------ | ------- | ------------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Long-form how-tos/i })` | heading | page renders + GET /api/guides fires                    | heading visible + GET /api/guides        | heading missing or GET fails |
| `getByRole("link").first()` (guide tile)               | link    | first guide tile is a real <a> link to /docs/guides/:id | href attribute starts with /docs/guides/ | no link rendered             |
| `getByText(/min read/i).first()`                       | text    | first guide row shows a read-time pill                  | text visible                             | no pill                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path        | what request body or query is expected |
| ------------ | ------ | ----------- | -------------------------------------- |
| initial load | GET    | /api/guides | 200 with array of guide rows           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_guides.spec.ts`
