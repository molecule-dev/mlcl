# Page observations: /forgot-password (ForgotPassword)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/forgot-password.html`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                   | success signal                                                       | failure signal                         |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------- |
| `getByLabel(/email/i)` first input                             | textbox | accepts the account email                                          | typed value reflected                                                | empty submit blocks the request        |
| `getByRole("button", { name: /send\s*reset\s*link\|reset/i })` | button  | submits the password-reset request to `/api/users/forgot-password` | success card visible; same response shape for known + unknown emails | inline error if request fails outright |
| `getByRole("link", { name: /back.*sign.*in/i })`               | link    | navigates back to `/login`                                         | URL becomes `/login`                                                 | stays on `/forgot-password`            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected |
| ---------------------- | ------ | -------------------------- | -------------------------------------- |
| submit Send reset link | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
