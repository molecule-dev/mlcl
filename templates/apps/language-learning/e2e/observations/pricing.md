# Page observations: Pricing /pricing

> Filled by AI agent driving the running app via Playwright. Each row
> corresponds to an element actually rendered by the page when this file
> was generated.

## Page state assumed

- [x] Authenticated (sign up first via apiSignup + attachToken)

## Elements

| selector / accessible name                          | role   | expected behavior on interaction | success signal                      | failure signal                       |
| --------------------------------------------------- | ------ | -------------------------------- | ----------------------------------- | ------------------------------------ |
| `getByRole('button', { name: /current plan/i })`    | button | triggers Current plan action     | visible state change or new request | no change / error toast / page crash |
| `getByRole('button', { name: /upgrade to pro/i })`  | button | triggers Upgrade to Pro action   | visible state change or new request | no change / error toast / page crash |
| `getByRole('button', { name: /upgrade to team/i })` | button | triggers Upgrade to Team action  | visible state change or new request | no change / error toast / page crash |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected |
| ----------- | ------ | --------------------- | -------------------------------------- |
| mount       | GET    | /api/billing/tiers    | —                                      |
| mount       | GET    | /api/billing/status   | —                                      |
| choose plan | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
