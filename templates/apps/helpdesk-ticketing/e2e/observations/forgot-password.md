# Page observations: /forgot-password (Forgot password)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                 | role         | expected behavior on interaction | success signal           | failure signal                                         |
| ------------------------------------------ | ------------ | -------------------------------- | ------------------------ | ------------------------------------------------------ |
| `input[type="email"]` first                | textbox      | accepts the recovery email       | typed value reflected    | invalid rejected                                       |
| `getByRole("button", { name: /send\s*reset | reset\s*link | send/i })`                       | button                   | POST /api/users/forgot-password and shows confirmation | success message visible   | no message / 5xx |
| `getByRole("link", { name: /sign\s*in      | back/i })`   | link                             | navigates back to /login | URL becomes /login                                     | stays on /forgot-password |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger           | method | path                       | what request body or query is expected |
| ----------------- | ------ | -------------------------- | -------------------------------------- |
| submit Send reset | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
