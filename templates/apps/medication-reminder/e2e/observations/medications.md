# Page observations: /medications (Medications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction           | success signal                                      | failure signal                                      |
| -------------------------- | ------- | ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
| Medications heading        | heading | renders "Medications" + counts             | heading + N active                                  | placeholder text                                    |
| `+ Add medication` link    | link    | navigates to /medications/new              | URL is /medications/new, AddMedication form visible | stays on /medications                               |
| Medication card row        | link    | navigates to /medications/:id when clicked | URL matches /medications/<id> with detail content   | stays on list page                                  |
| Empty state placeholder    | text    | shown when `GET /medications` returns []   | "No medications yet…" copy visible for fresh user   | list rendered with 0 cards but no empty placeholder |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path             | what request body or query is expected |
| ---------- | ------ | ---------------- | -------------------------------------- |
| Page mount | GET    | /api/medications | (none) — owner-scoped list             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/medications.spec.ts`
