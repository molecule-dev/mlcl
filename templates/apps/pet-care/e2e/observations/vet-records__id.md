# Page observations: /vet-records/:id (VetRecordDetail)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] A vet record exists for this user (seed via API)

## Elements

| selector / accessible name   | role    | expected behavior on interaction | success signal           | failure signal |
| ---------------------------- | ------- | -------------------------------- | ------------------------ | -------------- |
| back link to /vet-records    | link    | routes back to list              | URL becomes /vet-records | no nav         |
| `getByRole('heading')` first | heading | record title rendered            | rendered                 | missing        |
| record summary text          | text    | renders the saved summary        | text visible             | text missing   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                 | what request body or query is expected |
| ------- | ------ | -------------------- | -------------------------------------- |
| mount   | GET    | /api/vet-records/:id | record details                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vet-records__id.spec.ts`
