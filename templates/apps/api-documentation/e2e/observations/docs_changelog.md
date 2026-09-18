# Page observations: /docs/changelog (Changelog)

Source: live walk via Playwright + e2e/docs_changelog.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                           | success signal                                  | failure signal               |
| ---------------------------------------------- | ------- | ---------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Changelog/i })` | heading | changelog page renders, GET /api/changelog fires           | heading visible + GET /api/changelog in network | GET fails or heading missing |
| `getByText(/release_notes/i).first()`          | text    | eyebrow label visible                                      | eyebrow visible                                 | eyebrow missing              |
| changelog entries list                         | list    | either an entries list renders or the empty state is shown | either list rows OR empty state visible         | page blank                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| initial load | GET    | /api/changelog | 200 with array of release rows         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_changelog.spec.ts`
