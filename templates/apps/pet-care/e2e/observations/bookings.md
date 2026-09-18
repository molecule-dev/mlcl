# Page observations: /bookings (Bookings)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role    | expected behavior on interaction          | success signal            | failure signal |
| ---------------------------- | ------- | ----------------------------------------- | ------------------------- | -------------- |
| `getByRole('heading')` first | heading | "Bookings" rendered                       | rendered                  | missing        |
| empty-state CTA              | link    | routes to /sitters when no bookings exist | URL becomes /sitters      | no nav         |
| booking row link             | link    | routes to /bookings/:id                   | URL becomes /bookings/:id | no nav         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected |
| ------- | ------ | ------------- | -------------------------------------- |
| mount   | GET    | /api/bookings | list of user's bookings                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings.spec.ts`
