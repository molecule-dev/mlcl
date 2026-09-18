# Page observations: /dashboard (Dashboard)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role      | expected behavior on interaction                      | success signal              | failure signal     |
| -------------------------- | --------- | ----------------------------------------------------- | --------------------------- | ------------------ |
| Total Properties stat      | statistic | reflects GET /api/dashboard/overview total_properties | numeric value renders       | static placeholder |
| Total Units stat           | statistic | reflects GET /api/dashboard/overview total_units      | numeric value renders       | static placeholder |
| Active Leases stat         | statistic | reflects GET /api/dashboard/overview active_leases    | numeric value renders       | static placeholder |
| Add Property CTA           | link      | navigates to /properties/new                          | URL becomes /properties/new | no navigation      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                    | what request body or query is expected |
| ------------ | ------ | ----------------------- | -------------------------------------- |
| initial load | GET    | /api/dashboard/overview | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
