# Page observations: /messages (Messages)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role    | expected behavior on interaction            | success signal            | failure signal |
| ---------------------------- | ------- | ------------------------------------------- | ------------------------- | -------------- |
| `getByRole('heading')` first | heading | "Messages" rendered                         | rendered                  | missing        |
| empty state text             | text    | "no conversations" / sitter prompt          | text visible              | missing        |
| booking-thread link          | link    | routes to /bookings/:id when bookings exist | URL becomes /bookings/:id | no nav         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected |
| ------- | ------ | ------------- | -------------------------------------- |
| mount   | GET    | /api/bookings | bookings used as conversation threads  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages.spec.ts`
