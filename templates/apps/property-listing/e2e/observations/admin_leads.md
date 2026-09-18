# Page observations: /admin/leads (admin_leads)

Agent leads inbox (data hydrated from /api/leads).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal              | failure signal |
| -------------------------- | ------- | -------------------------------- | --------------------------- | -------------- |
| leads heading              | heading | page title rendered              | visible                     | missing        |
| status filter group        | group   | change status filter + re-fetch  | API re-fired                | no refresh     |
| leads table                | list    | render rows from /api/leads      | list or empty-state visible | crash          |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected |
| --------- | ------ | ---------- | -------------------------------------- |
| page load | GET    | /api/leads | → 200 list                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin_leads.spec.ts`
