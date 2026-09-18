# Page observations: /restaurants/:id (RestaurantDetail)

> Authenticated detail surface. On mount: GET /api/restaurants/:id +
> GET /api/restaurants/:id/menu + GET /api/reviews?restaurant_id=:id.
> Save toggle writes /api/favorites; "Write a review" navigates to the
> WriteReview route. Spec: e2e/04-restaurants__id.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role      | expected behavior on interaction                | success signal                             | failure signal |
| ----------------------------------------- | --------- | ----------------------------------------------- | ------------------------------------------ | -------------- |
| `[data-testid="restaurant-name"]`         | heading   | renders restaurant name from API                | visible with text                          | empty          |
| `[data-testid="restaurant-favorite"]`     | button    | toggles favorite via POST/DELETE /api/favorites | filled heart + GET /api/favorites reflects | no change      |
| `[data-testid="restaurant-write-review"]` | link      | navigates to /restaurants/:id/review            | URL becomes /restaurants/:id/review        | dead link      |
| `[data-testid="restaurant-reviews"]`      | container | renders existing reviews from /api/reviews      | review cards visible                       | empty          |
| `[data-testid="restaurant-directions"]`   | link      | external maps URL                               | href set                                   | broken         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger    | method | path                           | expected body     |
| ---------- | ------ | ------------------------------ | ----------------- |
| Page load  | GET    | /api/restaurants/:id           | restaurant object |
| Page load  | GET    | /api/restaurants/:id/menu      | menu items array  |
| Page load  | GET    | /api/reviews?restaurant_id=:id | review list       |
| Save click | POST   | /api/favorites                 | { restaurant_id } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-restaurants__id.spec.ts`
