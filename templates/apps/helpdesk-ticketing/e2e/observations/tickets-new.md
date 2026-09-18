# Page observations: /tickets/new (New ticket)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role    | expected behavior on interaction | success signal        | failure signal                           |
| ------------------------------------ | ------- | -------------------------------- | --------------------- | ---------------------------------------- |
| `input[type="text"]` first           | textbox | accepts the subject (required)   | typed value reflected | empty rejected on submit                 |
| `textarea` first                     | textbox | accepts the description          | typed value reflected | empty rejected                           |
| `getByRole("button", { name: /create | submit  | save/i })`                       | button                | POST /api/tickets → land on /tickets/:id | URL becomes /tickets/<id> | stays on /tickets/new with inline error |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path         | what request body or query is expected |
| -------------------- | ------ | ------------ | -------------------------------------- |
| submit Create ticket | POST   | /api/tickets | `{ subject, description, priority? }`  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tickets-new.spec.ts`
