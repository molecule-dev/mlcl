# Page observations: /customers/:id (CustomerDetail)

> Authenticated — single-customer profile. Loads from GET
> /api/customers/:id and renders an editable form (name, email,
> phone, notes), a Save action that PUTs back, and a Delete action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction                                                  | success signal                                       | failure signal             |
| -------------------------------------------- | ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| stored fields (name / email / phone / notes) | textbox | hydrated from GET /api/customers/:id                                              | values match the POST body that created the customer | form blank or wrong values |
| save action                                  | button  | PUT /api/customers/:id with edited fields; round-trips via GET (read-after-write) | reload shows the new values                          | edits lost on reload       |
| delete action                                | button  | DELETE /api/customers/:id; row gone from GET /api/customers                       | row absent on next list                              | row still listed           |
| 404 / not-found path                         | text    | hitting `/customers/<bogus-uuid>` doesn't crash — surfaces a not-found state      | not-found UI visible, no JS error                    | white-screen / crash       |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-customers__id.spec.ts`
