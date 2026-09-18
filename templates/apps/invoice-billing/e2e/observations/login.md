# Page observations: /login (Login)

> Login form for returning users. Drives `/api/users` (or auth bond's
> session endpoint) on submit and persists the JWT into localStorage so
> the rest of the app can fetch behind `Authorization: Bearer …`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                                                                              | success signal                                               | failure signal                        |
| --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `getByLabel(/work email/i)`                         | textbox            | accepts email; required                                                                                       | value retained; HTML5 validation only triggers on bad format | required-field flash                  |
| `getByLabel(/^password$/i)`                         | textbox (password) | accepts password; required                                                                                    | value retained, masked                                       | required-field flash                  |
| `getByRole('button', { name: /^Sign in$/ })` (form) | button             | POSTs credentials; on success redirects to `/dashboard`, persists `molecule:auth:accessToken` in localStorage | URL changes off `/login`, localStorage has token             | stays on `/login`, error banner shown |
| `getByRole('link', { name: /Forgot/ })`             | link               | navigates to `/forgot-password`                                                                               | URL ends `/forgot-password`                                  | stays on `/login`                     |
| `getByRole('link', { name: /Create one/ })`         | link               | navigates to `/signup`                                                                                        | URL ends `/signup`                                           | stays on `/login`                     |

## Hidden surfaces opened from this page

| trigger                               | what it opens                         | elements inside (selector / role / behavior) |
| ------------------------------------- | ------------------------------------- | -------------------------------------------- |
| Footer Privacy/Terms/Language buttons | shared modals (covered in /root spec) | —                                            |

## Network calls expected during normal use

| trigger                        | method | path                                    | what request body or query is expected                              |
| ------------------------------ | ------ | --------------------------------------- | ------------------------------------------------------------------- |
| Sign in submit (valid creds)   | POST   | /api/users (auth bond session endpoint) | `{ email, password }`; 200 + body containing `accessToken` and user |
| Sign in submit (invalid creds) | POST   | /api/users                              | 401 / 403 status; UI surfaces error                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
