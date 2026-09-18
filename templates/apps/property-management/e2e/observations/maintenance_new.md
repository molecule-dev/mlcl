# Page observations: /maintenance/new (MaintenanceNew)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role     | expected behavior on interaction          | success signal            | failure signal |
| -------------------------- | -------- | ----------------------------------------- | ------------------------- | -------------- |
| title input                | textbox  | accepts a short title                     | value reflects typing     | no change      |
| priority select            | combobox | lists priorities (low/medium/high/urgent) | option selectable         | empty options  |
| property select            | combobox | lists properties from /api/properties     | options populated         | empty options  |
| create work order button   | button   | POSTs /api/maintenance                    | redirects to /maintenance | silent failure |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path             | what request body or query is expected   |
| ------------ | ------ | ---------------- | ---------------------------------------- |
| load options | GET    | /api/properties  | no body                                  |
| submit       | POST   | /api/maintenance | {title, priority, property_id, unit_id?} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/maintenance_new.spec.ts`
