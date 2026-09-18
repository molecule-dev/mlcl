# Page observations: /billing (Billing)

> Authenticated. Shows the user's current plan + usage gauges (boards,
> collaborators) and a "Compare plans" link to /pricing. Hydrates from
> `GET /api/billing/status` and `GET /api/billing/tiers`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                              | role      | expected behavior on interaction                                                                                            | success signal               | failure signal               |
| --------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| `[data-mol-id="billing-current"]` + `billing-plan-name` + `billing-usage-collaborators` | container | the "current plan" card with user's `planKey` and a collaborators-usage gauge — all hydrated from /billing/status + /boards | all three visible after auth | crash / empty / wrong values |
| `[data-mol-id="billing-usage-boards"]`                                                  | text      | live boards count derived from `/api/boards` length                                                                         | "2" after seeding 2 boards   | wrong number                 |
| `[data-mol-id="billing-compare"]`                                                       | link      | nav to /pricing                                                                                                             | URL becomes `/pricing`       | stays on /billing            |
| GET `/api/billing/tiers` (consumed by tier ladder)                                      | network   | returns at least one tier with `key` + `name`                                                                               | non-empty array              | empty / 4xx                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected    |
| --------- | ------ | ------------------- | ----------------------------------------- |
| page load | GET    | /api/billing/status | 200 returns `{ planKey, isFree, limits }` |
| page load | GET    | /api/billing/tiers  | 200 returns array of tier rows            |
| page load | GET    | /api/boards         | 200 array (powers usage gauge)            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
