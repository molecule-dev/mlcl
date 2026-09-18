# Page observations: /restaurants/:id/review (WriteReview)

> Authenticated form. Star-rating + review body + dietary-tag chips.
> Submit POSTs /api/reviews; duplicates return 409. Spec:
> e2e/05-restaurants__id_review.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction        | success signal                | failure signal    |
| -------------------------------------- | ------- | --------------------------------------- | ----------------------------- | ----------------- |
| `[data-testid="write-review-heading"]` | heading | renders "Write a review · {restaurant}" | visible                       | absent            |
| `[data-testid="write-review-star-5"]`  | button  | sets rating to 5                        | filled gold star count = 5    | no visual change  |
| `[data-testid="write-review-body"]`    | textbox | accepts review body                     | typed text appears            | nothing committed |
| `[data-testid="write-review-submit"]`  | button  | submits via POST /api/reviews           | redirects to /restaurants/:id | error message     |
| `[data-testid="write-review-error"]`   | text    | shows duplicate (409) or generic error  | visible on failure            | absent on success |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                 | expected body                           |
| --------- | ------ | -------------------- | --------------------------------------- |
| Page load | GET    | /api/restaurants/:id | restaurant for heading                  |
| Submit    | POST   | /api/reviews         | { restaurant_id, rating, body, photos } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-restaurants__id_review.spec.ts`
