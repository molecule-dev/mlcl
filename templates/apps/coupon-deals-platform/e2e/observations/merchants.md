# Page observations: /merchants (Merchants)

> Captured authenticated. Searchable list of all merchants — each card
> shows category, location, rating, and active deal count.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                              | role      | expected behavior on interaction            | success signal                      | failure signal               |
| ------------------------------------------------------- | --------- | ------------------------------------------- | ----------------------------------- | ---------------------------- |
| `getByRole('heading', { name: 'Merchants', level: 1 })` | heading   | renders the page title                      | visible                             | missing                      |
| `getByRole('searchbox', { name: /search merchants/i })` | searchbox | filters merchants client-side by name       | typed value reflected, list filters | input read-only or no filter |
| `page.getByRole('listitem').first()`                    | listitem  | renders one of the merchant cards           | ≥3 listitems                        | empty list                   |
| `page.locator('a[href^="/merchants/"]').first()`        | link      | nav to /merchants/:id                       | URL becomes `/merchants/<uuid>`     | stays on `/merchants`        |
| `page.getByText(/active deals/i).first()`               | text      | renders the active-deal count badge per row | visible on each card                | missing                      |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none — flat list with search) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path           | expected body      |
| --------- | ------ | -------------- | ------------------ |
| Page load | GET    | /api/merchants | array of merchants |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/merchants.spec.ts`
