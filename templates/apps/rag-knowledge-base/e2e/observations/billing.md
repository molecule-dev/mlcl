# Page observations: /billing (Billing)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                          | role        | expected behavior on interaction                              | success signal   | failure signal   |
| ----------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- | ---------------- | ---------------- |
| `getByRole('heading', { level: 1 })`                                                | heading     | renders "Billing" h1                                          | h1 visible       | h1 missing       |
| `[data-testid="billing-metrics"]`                                                   | text        | renders the metric tiles row                                  | row visible      | row missing      |
| `[data-testid="billing-plans"]` or `[data-testid="billing-loading"]`                | list/text   | renders the plan cards OR loading                             | one is visible   | neither visible  |
| `[data-testid="billing-plans"] >> button, [data-testid="billing-plans"] >> a` (any) | button/link | clicking a plan starts checkout against /api/billing/checkout | POST is recorded | no POST observed |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| mount         | GET    | /api/billing/tiers    | none                                   |
| mount         | GET    | /api/billing/status   | scoped to current user                 |
| upgrade-click | POST   | /api/billing/checkout | { tier }                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
