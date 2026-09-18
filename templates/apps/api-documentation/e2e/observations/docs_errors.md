# Page observations: /docs/errors (Errors)

Source: live walk via Playwright + e2e/docs_errors.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role                | expected behavior on interaction         | success signal                 | failure signal          |
| --------------------------------------------- | ------------------- | ---------------------------------------- | ------------------------------ | ----------------------- |
| `getByRole("heading", { name: /^Errors$/i })` | heading             | page renders + GET /api/api_errors fires | heading visible + network call | page blank or GET fails |
| `getByText(/error_ref/i).first()`             | text                | eyebrow label is visible                 | eyebrow visible                | eyebrow missing         |
| `getByText(/4xx — Client errors               | 5xx — Server errors | No errors                                | Failed to load/i)`             | text                    | either grouped sections render OR a fallback message is shown (never a hung spinner) | one of the two visible | spinner persists |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| initial load | GET    | /api/api_errors | 200 with array of error entries        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_errors.spec.ts`
