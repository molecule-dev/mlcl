# Page observations: /companies/:id (CompanyDetail)

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                  | role             | expected behavior on interaction | success signal                      | failure signal            |
| ------------------------------------------- | ---------------- | -------------------------------- | ----------------------------------- | ------------------------- |
| Company name heading `getByRole('heading')` | heading          | shows the company name           | name text present                   | missing                   |
| Open jobs section `getByText(/jobs          | open\s*roles/i)` | status                           | lists this company's published jobs | jobs visible when present | absent |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected |
| ------- | ------ | ------------------ | -------------------------------------- |
| mount   | GET    | /api/companies/:id | company detail fetch                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/companies__id.spec.ts`
