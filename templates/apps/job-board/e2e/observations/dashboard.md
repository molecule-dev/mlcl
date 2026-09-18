# Page observations: /dashboard (Dashboard)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role               | expected behavior on interaction | success signal        | failure signal    |
| ------------------------------------------------- | ------------------ | -------------------------------- | --------------------- | ----------------- |
| `getByRole('heading')` first                      | heading            | visible above the fold           | rendered              | missing           |
| `getByRole('link', { name: /jobs                  | browse/i })` first | link                             | routes to /jobs       | URL becomes /jobs | no nav |
| `getByRole('link', { name: /post.*job/i })` first | link               | routes to /post-job              | URL becomes /post-job | no nav            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path      | what request body or query is expected |
| ------- | ------ | --------- | -------------------------------------- |
| mount   | GET    | /api/jobs | recent jobs for the dashboard summary  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
