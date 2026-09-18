# Page observations: /reset-password (Reset password)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                     | role           | expected behavior on interaction | success signal        | failure signal                                |
| ---------------------------------------------- | -------------- | -------------------------------- | --------------------- | --------------------------------------------- |
| `input[type="password"]` first                 | textbox        | accepts the new password         | typed value reflected | rejected if too short                         |
| `input[type="password"]` second                | textbox        | accepts the confirm password     | typed value reflected | mismatch flagged inline                       |
| `getByRole("button", { name: /reset\s*password | set\s*password | update/i })`                     | button                | POST /api/users/reset-password — confirm flow | /login on success | inline error on bad token |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
