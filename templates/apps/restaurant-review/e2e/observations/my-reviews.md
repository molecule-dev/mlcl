# Page observations: /my-reviews (MyReviews)

> Authenticated list surface. On mount: GET /api/reviews?user_id=:me +
> GET /api/restaurants/:id per review for the cuisine/name. Each row has
> an "Edit" link to /reviews/:id/edit. Spec: e2e/08-my-reviews.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role      | expected behavior on interaction     | success signal                | failure signal            |
| ----------------------------------- | --------- | ------------------------------------ | ----------------------------- | ------------------------- |
| `[data-testid="my-reviews-empty"]`  | container | empty-state for users with 0 reviews | visible for new user          | hidden when reviews exist |
| `[data-testid="my-reviews-list"]`   | container | one row per review                   | populated when reviews exist  | empty                     |
| `[data-testid="my-reviews-total"]`  | text      | total review count                   | numeric                       | absent                    |
| `[data-testid^="my-reviews-edit-"]` | link      | navigates to /reviews/:id/edit       | URL becomes /reviews/:id/edit | dead link                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                     | expected body      |
| --------- | ------ | ------------------------ | ------------------ |
| Page load | GET    | /api/reviews?user_id=:me | review list        |
| Page load | GET    | /api/restaurants/:id     | per-review hydrate |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-my-reviews.spec.ts`
