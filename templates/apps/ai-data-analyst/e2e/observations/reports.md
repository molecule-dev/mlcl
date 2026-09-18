# Page observations: /reports (Reports)

> Authenticated. Renders 3 seeded saved-report thumbnails from
> /api/saved_reports, each linking to /reports/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role     | expected behavior on interaction   | success signal                | failure signal      |
| ---------------------------------------------- | -------- | ---------------------------------- | ----------------------------- | ------------------- |
| `page.locator('main li')`                      | listitem | renders one card per seeded report | ≥1 visible                    | empty state         |
| `getByRole('button', { name: /new report/i })` | button   | nav to /query                      | URL becomes `/query`          | stays on `/reports` |
| `page.locator('a[href^="/reports/"]').first()` | link     | nav to /reports/:id                | URL becomes `/reports/<uuid>` | stays on `/reports` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path               | expected body                   |
| --------- | ------ | ------------------ | ------------------------------- |
| Page load | GET    | /api/saved_reports | array of decorated report cards |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-reports.spec.ts`
