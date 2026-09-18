# Page observations: /jobs (Jobs)

## Page state assumed

- [x] Public (the listings page is browsable; some actions require auth)

## Elements

| selector / accessible name                                                 | role      | expected behavior on interaction | success signal        | failure signal    |
| -------------------------------------------------------------------------- | --------- | -------------------------------- | --------------------- | ----------------- |
| `getByRole('heading')` first                                               | heading   | visible above the fold           | rendered              | missing           |
| Search input `getByPlaceholder(/search/i)` or `getByRole('textbox')` first | textbox   | filters the listings             | typed value persists  | input not present |
| Type-filter buttons `getByRole('button', { name: /full-time                | part-time | contract                         | internship            | all\s*types/i })` | button | switches the active filter | filter applied to list | no filter applied |
| Job row link to detail `getByRole('link')` first within row                | link      | navigates to /jobs/:id           | URL becomes /jobs/:id | no nav            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path      | what request body or query is expected |
| ------- | ------ | --------- | -------------------------------------- |
| mount   | GET    | /api/jobs | listing fetch                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/jobs.spec.ts`
