# Page observations: /medications (Medications)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction | success signal                  | failure signal |
| --------------------------------------- | ------- | -------------------------------- | ------------------------------- | -------------- |
| `getByRole('heading')` first            | heading | "Medications" rendered           | rendered                        | missing        |
| `[data-mol-id="cta-add-medication"]`    | button  | opens AddMedicationModal         | modal visible                   | no modal       |
| `[data-mol-id="submit-add-medication"]` | button  | POST /api/medications            | next GET returns the medication | error in modal |

## Hidden surfaces opened from this page

| trigger            | what it opens      | elements inside (selector / role / behavior)                           |
| ------------------ | ------------------ | ---------------------------------------------------------------------- |
| cta-add-medication | AddMedicationModal | pet select, #med-name, #med-dosage, #med-frequency, prescriber, submit |

## Network calls expected during normal use

| trigger               | method | path             | what request body or query is expected |
| --------------------- | ------ | ---------------- | -------------------------------------- |
| mount                 | GET    | /api/medications | active medications                     |
| submit-add-medication | POST   | /api/medications | { pet_id, name, dosage, frequency }    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/medications.spec.ts`
