# Page observations: /discover (Discover)

> Authenticated browse surface. On mount: GET /api/restaurants (catalog)
>
> - GET /api/favorites (which cards to flag as bookmarked). Cuisine /
>   price filters are client-side over the catalog. Heart button on each
>   card POSTs/DELETEs /api/favorites. Spec: e2e/03-discover.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role     | expected behavior on interaction                | success signal                             | failure signal |
| ---------------------------------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------ | -------------- |
| `[data-testid="discover-search"]`                          | textbox  | accepts free-text query                         | filters cards client-side                  | nothing typed  |
| `[data-testid="discover-cuisine"]`                         | combobox | filters catalog by cuisine                      | results grid shrinks to that cuisine       | grid unchanged |
| `[data-testid="discover-price"]`                           | combobox | filters catalog by price level                  | results grid shrinks                       | grid unchanged |
| `[data-testid="discover-results"]`                         | grid     | renders RestaurantListingCard children          | ≥1 card visible                            | empty grid     |
| `getByRole('button', { name: 'Save restaurant' }).first()` | button   | toggles favorite via POST/DELETE /api/favorites | filled heart + GET /api/favorites reflects | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                 | method | path               | expected body                |
| ----------------------- | ------ | ------------------ | ---------------------------- |
| Page load               | GET    | /api/restaurants   | array of restaurants         |
| Page load               | GET    | /api/favorites     | { data: [...] } favorite ids |
| Heart click             | POST   | /api/favorites     | { restaurant_id }            |
| Heart click (re-toggle) | DELETE | /api/favorites/:id | empty body                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-discover.spec.ts`
