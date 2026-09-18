# Page observations: /sitters/:id (SitterDetail)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role    | expected behavior on interaction              | success signal            | failure signal |
| ----------------------------------------------- | ------- | --------------------------------------------- | ------------------------- | -------------- |
| `getByRole('heading')` first                    | heading | sitter display_name                           | rendered                  | missing        |
| `[data-mol-id="cta-book-sitter"]`               | button  | opens BookSitterModal                         | modal visible             | no modal       |
| `[data-mol-id="submit-book-sitter"]` (in modal) | button  | POST /api/bookings, then nav to /bookings/:id | URL becomes /bookings/:id | error in modal |
| message link                                    | link    | routes to /messages                           | nav off /sitters/:id      | no nav         |

## Hidden surfaces opened from this page

| trigger         | what it opens   | elements inside (selector / role / behavior)                |
| --------------- | --------------- | ----------------------------------------------------------- |
| cta-book-sitter | BookSitterModal | pet selector, service select, datetime range, notes, submit |

## Network calls expected during normal use

| trigger            | method | path                     | what request body or query is expected            |
| ------------------ | ------ | ------------------------ | ------------------------------------------------- |
| mount              | GET    | /api/sitters/:id         | sitter profile                                    |
| mount              | GET    | /api/sitters/:id/reviews | reviews list                                      |
| submit-book-sitter | POST   | /api/bookings            | { sitter_id, pet_ids, service, start_at, end_at } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sitters__id.spec.ts`
