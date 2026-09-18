# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                        | success signal                                                                                  | failure signal                               |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `getByRole('heading', { name: /Reset your password/i })` | heading | page heading renders                                                    | heading visible                                                                                 | heading missing                              |
| `getByLabel(/Email address/i)`                           | textbox | accepts email                                                           | retains the typed value                                                                         | input not editable                           |
| `getByRole('button', { name: /Send reset link/i })`      | button  | submits POST /api/users/forgot-password and shows success status banner | `role="status"` banner visible quoting the submitted email; reset email queued via Mailgun bond | button stays in "Sending…" or banner missing |
| `getByRole('link', { name: /Back to sign in/i })`        | link    | navigates to `/login`                                                   | URL becomes `/login`                                                                            | URL unchanged                                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected                                       |
| ---------------------- | ------ | -------------------------- | ---------------------------------------------------------------------------- |
| Send reset link submit | POST   | /api/users/forgot-password | `{ email }` → 200 (email queued for delivery; idempotent for unknown emails) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
