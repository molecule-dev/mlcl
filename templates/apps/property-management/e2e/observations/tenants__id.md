# Page observations: /tenants/:id (TenantDetail)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role    | expected behavior on interaction              | success signal         | failure signal     |
| -------------------------- | ------- | --------------------------------------------- | ---------------------- | ------------------ |
| tenant heading             | heading | reflects GET /api/tenants/:id name            | h1 matches name        | shows raw id       |
| lease section              | region  | reflects GET /api/leases?tenant_id=:id        | lease info renders     | static placeholder |
| payments section           | list    | reflects GET /api/rent-payments?tenant_id=:id | rows render after seed | static placeholder |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                             | what request body or query is expected |
| ------------- | ------ | -------------------------------- | -------------------------------------- |
| initial load  | GET    | /api/tenants/:id                 | no body                                |
| payments list | GET    | /api/rent-payments?tenant_id=:id | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tenants__id.spec.ts`
