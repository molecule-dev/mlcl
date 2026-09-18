# Page observations: /post-job (PostJob)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role        | expected behavior on interaction | success signal         | failure signal                |
| ----------------------------------------------------- | ----------- | -------------------------------- | ---------------------- | ----------------------------- |
| `getByLabel(/job title                                | ^title$/i)` | textbox                          | accepts the role name  | typed value persists          | empty submit blocked |
| `getByLabel(/description/i)` or first textarea        | textbox     | accepts the long description     | typed value persists   | empty submit blocked          |
| `getByLabel(/location/i)`                             | textbox     | accepts a location               | typed value persists   | n/a                           |
| Type select `getByLabel(/type/i)` first or `<select>` | combobox    | switches the type enum           | selected value updates | invalid value rejected by API |
| Submit `getByRole('button', { name: /post             | publish     | create                           | submit/i })`           | button                        | POST /api/jobs       | new row in /api/jobs + redirect | 4xx + inline error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path      | what request body or query is expected              |
| ----------- | ------ | --------- | --------------------------------------------------- |
| submit form | POST   | /api/jobs | { title, description, location, type, company_id? } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/post-job.spec.ts`
