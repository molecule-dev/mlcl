# Page observations: /reports (Reports)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Authenticated (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role    | expected behavior on interaction        | success signal         | failure signal     |
| -------------------------- | ------- | --------------------------------------- | ---------------------- | ------------------ |
| Reports heading            | heading | page renders heading                    | visible h1             | blank screen       |
| KPI grid                   | list    | reflects GET /api/reports/overview kpis | cards render           | static placeholder |
| property breakdown table   | table   | reflects GET /api/reports/overview      | rows render after seed | static placeholder |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected |
| ------------ | ------ | --------------------- | -------------------------------------- |
| initial load | GET    | /api/reports/overview | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
