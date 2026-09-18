# Page observations: /login (Login)

Source: live walk via Playwright + e2e/login.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                      | role    | expected behavior on interaction                                        | success signal                                       | failure signal             |
| ----------------------------------------------- | ------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| `getByRole("textbox", { name: /email/i })`      | textbox | enter the email of an existing account                                  | input value reflected                                | input not editable         |
| `getByRole("textbox", { name: /^password$/i })` | textbox | enter password                                                          | input value reflected                                | input not editable         |
| `getByRole("button", { name: /Sign In/i })`     | button  | submit fires POST /api/sessions (login); on success, redirects to /docs | URL no longer /login + POST /api/sessions in network | still on /login or no POST |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected                     |
| ------- | ------ | ------------- | ---------------------------------------------------------- |
| submit  | POST   | /api/sessions | {email,password} body — 200 OK with accessToken on success |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
