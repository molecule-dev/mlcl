# Page observations: /plan-updated (Plan updated)

> Authenticated — landing page Stripe redirects to after a successful
> Checkout. Confirms the upgrade and offers a link back home/dashboard.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction | success signal  | failure signal           |
| ----------------------------------------------- | ----------- | -------------------------------- | --------------- | ------------------------ |
| `getByText(/your plan has been updated          | plan        | thank/i).first()`                | text            | renders the success copy | text visible           | empty page                      |
| `getByText(/thank you/i)`                       | text        | confirms the upgrade             | text visible    | text missing             |
| `getByRole('link', { name: /home                | back        | return                           | dashboard/i })` | link                     | nav to / or /dashboard | URL becomes `/` or `/dashboard` | stays here |
| `page.locator('[data-mol-id="nav-dashboard"]')` | sidebar nav | confirms layout shell rendered   | element visible | layout broken            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-plan-updated.spec.ts`
