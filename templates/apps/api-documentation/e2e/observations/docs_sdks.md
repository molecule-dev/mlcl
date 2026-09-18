# Page observations: /docs/sdks (SDKs)

Source: live walk via Playwright + e2e/docs_sdks.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                  | success signal                  | failure signal               |
| ------------------------------------------- | ------- | ------------------------------------------------- | ------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /^SDKs$/i })` | heading | page renders + GET /api/sdks fires                | heading visible + GET /api/sdks | heading missing or GET fails |
| `getByText(/CLIENT_LIBS/i).first()`         | text    | eyebrow label visible                             | visible                         | missing                      |
| SDK cards or empty-state                    | list    | either ≥1 SDK card renders OR empty state visible | one of the two visible          | page blank                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path      | what request body or query is expected |
| ------------ | ------ | --------- | -------------------------------------- |
| initial load | GET    | /api/sdks | 200 with array of SDK rows             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_sdks.spec.ts`
