# Page observations: /vet-records (VetRecords)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction | success signal              | failure signal |
| --------------------------------------- | ------- | -------------------------------- | --------------------------- | -------------- |
| `getByRole('heading')` first            | heading | "Vet records" rendered           | rendered                    | missing        |
| `[data-mol-id="cta-add-vet-record"]`    | button  | opens AddVetRecordModal          | modal visible               | no modal       |
| `[data-mol-id="submit-add-vet-record"]` | button  | POST /api/vet-records            | next GET returns the record | error in modal |

## Hidden surfaces opened from this page

| trigger            | what it opens     | elements inside (selector / role / behavior)                                    |
| ------------------ | ----------------- | ------------------------------------------------------------------------------- |
| cta-add-vet-record | AddVetRecordModal | pet select, kind, #vr-title, date, #vr-vet, #vr-summary, follow-up date, submit |

## Network calls expected during normal use

| trigger               | method | path             | what request body or query is expected |
| --------------------- | ------ | ---------------- | -------------------------------------- |
| mount                 | GET    | /api/vet-records | list of user's vet records             |
| mount                 | GET    | /api/pets        | for the pet selector                   |
| submit-add-vet-record | POST   | /api/vet-records | { pet_id, kind, title, summary, ... }  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vet-records.spec.ts`
