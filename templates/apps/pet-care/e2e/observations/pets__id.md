# Page observations: /pets/:id (PetDetail)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] A pet exists for this user (seed via API)

## Elements

| selector / accessible name         | role    | expected behavior on interaction    | success signal    | failure signal |
| ---------------------------------- | ------- | ----------------------------------- | ----------------- | -------------- |
| back link to /pets                 | link    | routes back to list                 | URL becomes /pets | no nav         |
| `[data-mol-id="pet-name"]` heading | heading | pet name rendered                   | rendered          | missing        |
| activity timeline section          | text    | renders past bookings + vet records | text visible      | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                        | what request body or query is expected |
| ------- | ------ | --------------------------- | -------------------------------------- |
| mount   | GET    | /api/pets/:id               | pet profile                            |
| mount   | GET    | /api/vet-records?pet_id=:id | timeline records                       |
| mount   | GET    | /api/bookings?pet_id=:id    | timeline bookings                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pets__id.spec.ts`
