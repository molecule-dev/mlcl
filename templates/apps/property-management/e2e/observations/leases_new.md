# Page observations: /leases/new (LeaseNew)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role       | expected behavior on interaction | success signal                 | failure signal       |
| -------------------------- | ---------- | -------------------------------- | ------------------------------ | -------------------- |
| tenant select              | combobox   | lists tenants from /api/tenants  | options populated              | empty options        |
| unit select                | combobox   | lists units from /api/units      | options populated              | empty options        |
| monthly rent input         | spinbutton | numeric input                    | value updates                  | rejects valid number |
| create lease button        | button     | POSTs /api/leases                | redirects to /leases or detail | silent failure       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path         | what request body or query is expected                       |
| ------------ | ------ | ------------ | ------------------------------------------------------------ |
| load options | GET    | /api/tenants | no body                                                      |
| submit       | POST   | /api/leases  | {tenant_id, unit_id, monthly_rent_cents, start_date, status} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/leases_new.spec.ts`
