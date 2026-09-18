# Page observations: /medications/:id (MedicationDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); medication seeded.

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                           | success signal                                                      | failure signal                        |
| --------------------------------------------------- | ------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| Medication name heading                             | heading | renders `med.name`                                         | matches seeded name                                                 | empty heading                         |
| Adherence / pills-left / refills / taken stat cards | group   | reflect server values                                      | numeric values present                                              | always 0                              |
| Schedule chips list                                 | list    | renders `med.schedule_times` from server                   | shows `08:00` chip after seed                                       | empty chip list                       |
| Edit button                                         | button  | opens inline edit form                                     | edit form visible with prefilled values                             | nothing happens                       |
| Edit form Save button                               | button  | PATCHes /api/medications/:id and updates header            | header reflects new name; GET /medications/:id confirms persistence | header stale, no PATCH issued         |
| Edit form Cancel button                             | button  | closes edit form without changes                           | edit form hidden; values unchanged                                  | edit form persists                    |
| Delete button                                       | button  | opens confirm dialog                                       | dialog with role=alertdialog visible                                | navigates immediately                 |
| Delete confirm button                               | button  | DELETEs /api/medications/:id and navigates to /medications | URL is /medications; med no longer in `GET /medications`            | medication still present after delete |
| Back to All medications link                        | link    | navigates to /medications                                  | URL is /medications                                                 | stays on detail                       |

## Hidden surfaces opened from this page

| trigger       | what it opens    | elements inside (selector / role / behavior)                                 |
| ------------- | ---------------- | ---------------------------------------------------------------------------- |
| Edit button   | inline edit form | name / dose_amount / schedule_summary / pharmacy text inputs + Save / Cancel |
| Delete button | confirm dialog   | role=alertdialog, Cancel / Delete medication buttons                         |

## Network calls expected during normal use

| trigger        | method | path                         | what request body or query is expected                    |
| -------------- | ------ | ---------------------------- | --------------------------------------------------------- |
| Page mount     | GET    | /api/medications/:id         | (none)                                                    |
| Page mount     | GET    | /api/doses?medication_id=:id | (none) — dose history list                                |
| Save edit      | PATCH  | /api/medications/:id         | { name, dose_amount, dosage, schedule_summary, pharmacy } |
| Confirm delete | DELETE | /api/medications/:id         | (none)                                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/medications__id.spec.ts`
