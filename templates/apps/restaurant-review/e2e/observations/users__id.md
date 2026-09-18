# Page observations: /users/:id (Profile)

> Public profile surface. On mount: GET /api/users/:id (own profile when
> :id matches session userId; falls back to derived display for other
> users) + GET /api/reviews?user_id=:id. Spec: e2e/17-users__id.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role      | expected behavior on interaction     | success signal               | failure signal            |
| --------------------------------------- | --------- | ------------------------------------ | ---------------------------- | ------------------------- |
| `[data-testid="profile-name"]`          | heading   | renders the user's display name      | visible                      | absent                    |
| `[data-testid="profile-stat-reviews"]`  | text      | total reviews stat                   | numeric                      | absent                    |
| `[data-testid="profile-reviews-empty"]` | container | empty state for users with 0 reviews | visible for new user         | hidden when reviews exist |
| `[data-testid="profile-reviews"]`       | container | list of review excerpts              | populated when reviews exist | hidden when empty         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                     | expected body                          |
| --------- | ------ | ------------------------ | -------------------------------------- |
| Page load | GET    | /api/users/:id           | user object (own only; 401 for others) |
| Page load | GET    | /api/reviews?user_id=:id | review list                            |
| Page load | GET    | /api/restaurants/:id     | per-review hydrate                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-users__id.spec.ts`
