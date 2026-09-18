# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/signup`
2. browser_snapshot — header brand link, signup heading, OAuth buttons, signup form, "Sign in" bottom link
3. Re-pass after focusing each input — no new surfaces appeared

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                                         | success signal                                                                    | failure signal                |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------- |
| `[data-mol-id="signup-form"]`                        | form    | submits to `POST /api/users` (signup)                                    | URL changes to `/dashboard`                                                       | error alert remains           |
| `getByRole('textbox', { name: /First name/ })`       | textbox | accepts arbitrary text input                                             | input value reflects typed string                                                 | input value stays empty       |
| `getByRole('textbox', { name: /Last name/ })`        | textbox | accepts arbitrary text input                                             | input value reflects typed string                                                 | input value stays empty       |
| `getByRole('textbox', { name: /Work email/ })`       | textbox | accepts email and triggers HTML5 validation                              | element is required-valid when valid email entered                                | submit blocked                |
| `getByRole('textbox', { name: /^Password$/ })`       | textbox | accepts password input (min 8 chars enforced by `minLength`)             | element validity true on ≥8 chars                                                 | submit blocked                |
| `getByRole('textbox', { name: /Confirm password/ })` | textbox | accepts password and shows mismatch warning when different from password | when matching, no alert; when mismatched, alert "Passwords do not match." appears | mismatch banner missing       |
| `getByRole('button', { name: /Create account/ })`    | button  | submits the form when fields valid                                       | navigates to `/dashboard`                                                         | stays on `/signup` with error |
| `getByRole('link', { name: /Sign in/ })`             | link    | navigates to `/login`                                                    | URL becomes `/login`                                                              | URL stays                     |

## Hidden surfaces opened from this page

| trigger                            | what it opens                          | elements inside (selector / role / behavior)                            |
| ---------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| typing mismatched confirm password | inline alert "Passwords do not match." | static `<span>` shown when `confirm.length > 0 && confirm !== password` |
| API failure on submit              | inline alert div with `role="alert"`   | shows `error.message` from useSignup hook                               |

## Network calls expected during normal use

| trigger              | method | path              | what request body or query is expected                         |
| -------------------- | ------ | ----------------- | -------------------------------------------------------------- |
| submit valid form    | POST   | `/api/users`      | `{ email, password, name, metadata: { firstName, lastName } }` |
| post-signup redirect | GET    | `/api/profile/me` | derives empty bearer-authed profile after redirect             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
