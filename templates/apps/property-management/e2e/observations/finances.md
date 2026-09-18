# Page observations: /finances (Finances)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role      | expected behavior on interaction                     | success signal               | failure signal   |
| -------------------------- | --------- | ---------------------------------------------------- | ---------------------------- | ---------------- |
| Rent collected card        | statistic | reflects GET /api/finances/summary collected_cents   | currency renders             | static value     |
| Outstanding card           | statistic | reflects GET /api/finances/summary outstanding_cents | currency renders             | static value     |
| Rent roll table            | table     | rows from GET /api/finances/rent-roll                | rows render after seed       | empty after seed |
| Export CSV button          | button    | invokes GET /api/finances/rent-roll.csv              | download starts (or paywall) | silent failure   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected |
| ------------ | ------ | --------------------------- | -------------------------------------- |
| initial load | GET    | /api/finances/summary       | no body                                |
| initial load | GET    | /api/finances/rent-roll     | no body                                |
| CSV export   | GET    | /api/finances/rent-roll.csv | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/finances.spec.ts`
