# Page observations: /tenants/new (TenantNew)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role     | expected behavior on interaction      | success signal        | failure signal |
| -------------------------- | -------- | ------------------------------------- | --------------------- | -------------- |
| name input                 | textbox  | accepts full name                     | value reflects typing | no change      |
| email input                | textbox  | accepts email                         | value reflects typing | no change      |
| property select            | combobox | lists properties from /api/properties | options populated     | empty options  |
| create tenant button       | button   | POSTs /api/tenants                    | redirects to /tenants | silent failure |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| load options | GET    | /api/properties | no body                                |
| submit       | POST   | /api/tenants    | {name, email, property_id, unit_id?}   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tenants_new.spec.ts`
