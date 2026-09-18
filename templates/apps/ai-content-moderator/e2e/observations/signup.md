# Page observations: /signup (Signup)

Source: live walk via Playwright + e2e/signup.spec.ts. Every row
has a passing test that drives the element and asserts on the
real outcome (registration row created, JWT in localStorage,
redirect to /dashboard, persistence across reload).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role | expected behavior on interaction                                                                        | success signal                                                         | failure signal                   |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| signup form renders all fields            | form | first-name + last-name + email + password + confirm + submit all visible                                | all 5 inputs + submit button found                                     | one or more missing              |
| password mismatch                         | flow | mismatched passwords show inline "Passwords do not match" alert and do NOT POST                         | inline alert visible, URL still `/signup`, no `/api/users` call        | submit succeeds despite mismatch |
| happy-path signup                         | flow | filling all fields + submit POSTs `/api/users`, redirects to `/dashboard`, persists JWT to localStorage | URL `/dashboard`, `localStorage['molecule:auth:accessToken']` non-null | error stays on `/signup`         |
| reload-after-signup persistence           | flow | after a fresh signup, `page.reload()` keeps the user on `/dashboard`                                    | URL still `/dashboard` after reload                                    | bounced to `/login`              |
| `getByRole('link', { name: /sign in/i })` | link | navigates back to `/login`                                                                              | URL becomes `/login`                                                   | URL unchanged                    |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------- | ------------- | -------------------------------------------- |
| (none — signup page is flat) | —             | —                                            |

## Network calls expected during normal use

| trigger                     | method | path       | what request body or query is expected                        |
| --------------------------- | ------ | ---------- | ------------------------------------------------------------- |
| password mismatch on submit | (none) | (none)     | client-side validation, no network call                       |
| valid form submit           | POST   | /api/users | { email, password, name } → 201 with accessToken + user props |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
