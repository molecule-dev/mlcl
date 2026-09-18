# Page observations: /favorites (Favorites)

> Authenticated list surface. On mount: GET /api/favorites + a follow-up
> GET /api/restaurants/:id per favorite to hydrate names/cards. Heart
> button on each card unfavorites. Spec: e2e/07-favorites.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role      | expected behavior on interaction          | success signal                                  | failure signal              |
| -------------------------------------------------- | --------- | ----------------------------------------- | ----------------------------------------------- | --------------------------- |
| `[data-testid="favorites-empty"]`                  | container | empty-state when no favorites             | visible for new user                            | hidden when favorites exist |
| `[data-testid="favorites-results"]`                | grid      | renders RestaurantListingCard children    | ≥1 card per favorite                            | hidden when empty           |
| `getByRole('button', { name: 'Save restaurant' })` | button    | unfavorites via DELETE /api/favorites/:id | card disappears, GET /api/favorites count drops | no change                   |
| `[data-testid="favorites-cuisine-count"]`          | text      | summary stat                              | matches favorite count                          | absent                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path                 | expected body                |
| ----------- | ------ | -------------------- | ---------------------------- |
| Page load   | GET    | /api/favorites       | { data: [...] } favorite ids |
| Page load   | GET    | /api/restaurants/:id | per-favorite hydrate         |
| Heart click | DELETE | /api/favorites/:id   | empty body                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-favorites.spec.ts`
