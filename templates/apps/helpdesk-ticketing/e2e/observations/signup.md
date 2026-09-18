# Page observations: /signup (Signup)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                     | role            | expected behavior on interaction                    | success signal              | failure signal                          |
| ---------------------------------------------- | --------------- | --------------------------------------------------- | --------------------------- | --------------------------------------- |
| `#email, input[type="email"]` first            | textbox         | accepts email, becomes the signup identifier        | typed value reflected       | invalid format rejected on submit       |
| `#password, input[type="password"]` first      | textbox         | accepts password (min 8 chars enforced server-side) | typed value reflected       | too-short rejected                      |
| `getByRole("button", { name: /create\s*account | sign\s*up/i })` | button                                              | POST /api/users → land on / | URL leaves /signup; JWT in localStorage | stays on /signup with inline error |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| submit Create account | POST   | /api/users | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
