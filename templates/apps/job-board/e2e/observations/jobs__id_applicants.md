# Page observations: /jobs/:id/applicants (JobApplicants)

## Page state assumed

- [x] Authenticated as the job's owner (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                 | success signal                      | failure signal |
| ------------------------------------------------ | -------- | ------------------------------------------------ | ----------------------------------- | -------------- |
| Page heading `getByRole('heading')` first        | heading  | shows the applicants section title               | rendered                            | missing        |
| Empty-state copy `getByText(/no\s*applicants/i)` | status   | shown when there are no applicants               | text visible on a fresh job         | absent         |
| Status select `getByRole('combobox')` first      | combobox | PUT /api/applications/:id/status changes the row | option saved + reflected on refresh | 4xx            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| mount   | GET    | /api/applications | filtered to this job_id                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/jobs__id_applicants.spec.ts`
