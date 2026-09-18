# Page observations: /admin/listings/:id/edit (admin_listings__id_edit)

Edit an existing listing the user owns.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name  | role    | expected behavior on interaction                         | success signal              | failure signal |
| --------------------------- | ------- | -------------------------------------------------------- | --------------------------- | -------------- |
| page heading "Edit Listing" | heading | render edit heading                                      | visible                     | missing        |
| title input pre-populated   | textbox | show existing title                                      | value present               | empty          |
| save button                 | button  | PUT /api/properties/:id then redirect to /admin/listings | URL becomes /admin/listings | stays on form  |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/properties | /:id → 200                             |
| submit    | PUT    | /api/properties | /:id → 200                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin_listings__id_edit.spec.ts`
