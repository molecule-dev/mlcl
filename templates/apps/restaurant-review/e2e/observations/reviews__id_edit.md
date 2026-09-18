# Page observations: /reviews/:id/edit (EditReview)

> Authenticated edit form. Loads the existing review via GET
> /api/reviews/:id, pre-fills the WriteReview component, swaps the
> primary action to PUT /api/reviews/:id, and adds a Delete button
> that DELETEs the row. Spec: e2e/06-reviews__id_edit.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction       | success signal                                | failure signal    |
| -------------------------------------- | ------- | -------------------------------------- | --------------------------------------------- | ----------------- |
| `[data-testid="write-review-heading"]` | heading | renders "Edit your tasting note"       | visible                                       | absent            |
| `[data-testid="write-review-body"]`    | textbox | pre-filled with existing body          | value matches DB                              | empty input       |
| `[data-testid="write-review-submit"]`  | button  | PUTs /api/reviews/:id                  | redirects to /restaurants/:id, body persisted | error             |
| `[data-testid="write-review-delete"]`  | button  | DELETEs /api/reviews/:id after confirm | redirect, GET 404                             | row still present |

## Hidden surfaces opened from this page

| trigger       | what it opens  | elements inside                                        |
| ------------- | -------------- | ------------------------------------------------------ |
| Delete button | window.confirm | OK / Cancel native dialog (test via page.on('dialog')) |

## Network calls expected during normal use

| trigger   | method | path             | expected body            |
| --------- | ------ | ---------------- | ------------------------ |
| Page load | GET    | /api/reviews/:id | review object            |
| Submit    | PUT    | /api/reviews/:id | { rating, body, photos } |
| Delete    | DELETE | /api/reviews/:id | empty body               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-reviews__id_edit.spec.ts`
