# Page observations: /profile (Profile)

Source: live walk via Playwright + e2e/profile.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction      | success signal                     | failure signal               |
| ------------------------------------------------------ | ------- | ------------------------------------- | ---------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Developer profile/i })` | heading | page renders + GET /api/profile fires | heading visible + GET /api/profile | heading missing or GET fails |
| `getByText(/PROFILE/i).first()`                        | text    | eyebrow label visible                 | eyebrow visible                    | eyebrow missing              |
| `getByText(/API_USAGE_30D/i)`                          | text    | usage card visible                    | visible                            | missing                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path         | what request body or query is expected |
| ------------ | ------ | ------------ | -------------------------------------- |
| initial load | GET    | /api/profile | 200 with profile fields                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
