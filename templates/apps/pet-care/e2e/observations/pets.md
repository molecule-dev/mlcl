# Page observations: /pets (Pets)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role         | expected behavior on interaction | success signal                     | failure signal       |
| ------------------------------------------------------------------ | ------------ | -------------------------------- | ---------------------------------- | -------------------- |
| `[data-mol-id="cta-add-pet"]` (or `cta-add-first-pet` empty state) | button       | opens AddPetModal                | modal visible with #pet-name       | no modal             |
| `#pet-name`, `#pet-species`, `#pet-breed` (in modal)               | input/select | accept pet info                  | values update                      | input rejected       |
| `[data-mol-id="submit-add-pet"]`                                   | button       | POST /api/pets, closes modal     | next GET /pets returns the new pet | error toast in modal |
| pet card link (after creation)                                     | link         | routes to /pets/:id              | URL becomes /pets/:id              | no nav               |

## Hidden surfaces opened from this page

| trigger     | what it opens | elements inside (selector / role / behavior)                          |
| ----------- | ------------- | --------------------------------------------------------------------- |
| cta-add-pet | AddPetModal   | #pet-name input, #pet-species select, #pet-breed input, submit button |

## Network calls expected during normal use

| trigger        | method | path      | what request body or query is expected |
| -------------- | ------ | --------- | -------------------------------------- |
| mount          | GET    | /api/pets | list of user's pets                    |
| submit-add-pet | POST   | /api/pets | { name, species, breed, ... }          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pets.spec.ts`
