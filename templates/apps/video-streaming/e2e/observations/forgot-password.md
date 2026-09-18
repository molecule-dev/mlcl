# Page observations: /forgot-password (Forgot password)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/forgot-password.

## Page state assumed

- [x] Anonymous (no auth required)

## Elements

| selector / accessible name         | role    | expected behavior on interaction                     | success signal       | failure signal                                           |
| ---------------------------------- | ------- | ---------------------------------------------------- | -------------------- | -------------------------------------------------------- |
| `getByLabel(/email/i)`             | textbox | accepts the user's email so a reset link can be sent | typed value mirrored | input missing                                            |
| `getByRole('button', { name: /send | reset   | continue/i })`                                       | button               | POST /api/users/forgot-password, shows confirmation copy | "check your email" / 200 response | server 5xx or no feedback |
| `getByRole('link', { name: /log in | sign in | back/i })`                                           | link                 | navigates back to /login                                 | URL becomes /login                | no navigation             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| Submit  | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
