# Page observations: /jobs/:id (JobDetail)

## Page state assumed

- [x] Authenticated (Apply + Save controls require a session)

## Elements

| selector / accessible name                                   | role                | expected behavior on interaction | success signal                               | failure signal                              |
| ------------------------------------------------------------ | ------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------------- |
| Job title heading `getByRole('heading', { name: /title/i })` | heading             | shows the job title              | title text present                           | missing                                     |
| Apply button `getByRole('button', { name: /apply/i })`       | button              | POST /api/applications           | new applications row + UI toggles to applied | 4xx                                         |
| Save-job button `getByRole('button', { name: /save\s+job     | ^save$/i })`        | button                           | POST /api/saved-jobs                         | bookmark icon flips, /saved-jobs row exists | 4xx    |
| Apply-applicant-count `getByText(/applicants? so far         | applicant count/i)` | status                           | renders a count when the job has them        | number visible                              | absent |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected        |
| ----------- | ------ | ----------------- | --------------------------------------------- |
| mount       | GET    | /api/jobs/:id     | fetch the detail row                          |
| mount       | GET    | /api/saved-jobs   | check whether the user already saved this job |
| Apply click | POST   | /api/applications | { job_id }                                    |
| Save click  | POST   | /api/saved-jobs   | { job_id }                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/jobs__id.spec.ts`
