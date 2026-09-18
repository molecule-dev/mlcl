# Page observations: /signup (Signup)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/signup.html`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                   | role    | expected behavior on interaction                       | success signal                                 | failure signal                       |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------ |
| `input#name, input[name="name"]` first                                       | textbox | accepts display name                                   | typed value reflected                          | empty rejected on submit             |
| `input[type="email"], input#email` first                                     | textbox | accepts email                                          | typed value reflected                          | invalid format rejected              |
| `input[type="password"]` first                                               | textbox | accepts password                                       | typed value reflected                          | too-short rejected                   |
| `getByRole("button", { name: /create account\|sign\s*up\|get\s*started/i })` | button  | POST `/api/users` and route to `/dashboard` on success | URL becomes `/dashboard`; auth survives reload | stays on `/signup` with inline error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| submit Create account | POST   | /api/users | `{ name, email, password }`            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
