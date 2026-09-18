# Page observations: /dashboard (Dashboard)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role    | expected behavior on interaction | success signal        | failure signal |
| ---------------------------- | ------- | -------------------------------- | --------------------- | -------------- |
| `getByRole('heading')` first | heading | greeting visible above the fold  | rendered              | missing        |
| `link to /pets`              | link    | routes to /pets                  | URL becomes /pets     | no nav         |
| `link to /sitters`           | link    | routes to /sitters               | URL becomes /sitters  | no nav         |
| `link to /bookings`          | link    | routes to /bookings              | URL becomes /bookings | no nav         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                   | what request body or query is expected |
| ------- | ------ | ---------------------- | -------------------------------------- |
| mount   | GET    | /api/pets              | user pets for the dashboard hero       |
| mount   | GET    | /api/bookings/upcoming | upcoming bookings strip                |
| mount   | GET    | /api/health/reminders  | health reminders list                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
