# Page observations: /billing

> Authenticated billing dashboard. Shows the active plan, status, plan
> note, and a Manage/Cancel button.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                        | role          | expected behavior on interaction | success signal                               | failure signal              |
| --------------------------------------------------------------------------------- | ------------- | -------------------------------- | -------------------------------------------- | --------------------------- |
| `getByRole("heading", { level: 1 })`                                              | heading       | shows billing heading            | visible                                      | empty                       |
| `getByText(/free                                                                  | plan/i)`      | label                            | shows current plan name                      | visible                     | empty   |
| `getByRole("button", { name: /cancel/i })` or `getByRole("link", { name: /pricing | upgrade/i })` | control                          | for paid: cancel; for free: link to /pricing | follows respective behavior | nothing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path                | expected body          |
| ------------ | ------ | ------------------- | ---------------------- |
| page load    | GET    | /api/billing/status | { plan_id, status, … } |
| cancel click | POST   | /api/billing/cancel | { ok: true } 200       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-billing.spec.ts`
