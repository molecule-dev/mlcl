# Page observations: /datasets (Datasets)

> Authenticated. Renders 4 seeded dataset cards (one per seed sample)
> from /api/datasets, each linking to /datasets/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction    | success signal                 | failure signal       |
| ------------------------------------------------ | -------- | ----------------------------------- | ------------------------------ | -------------------- |
| `page.locator('main li')`                        | listitem | renders one card per seeded dataset | ≥1 visible                     | empty state          |
| `getByRole('link', { name: /upload dataset/i })` | link     | nav to /upload                      | URL becomes `/upload`          | stays on `/datasets` |
| `page.locator('a[href^="/datasets/"]').first()`  | link     | dataset card — nav to /datasets/:id | URL becomes `/datasets/<uuid>` | stays on `/datasets` |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside |
| ------------------ | ------------- | --------------- |
| (none — list view) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path          | expected body                    |
| --------- | ------ | ------------- | -------------------------------- |
| Page load | GET    | /api/datasets | array of decorated dataset cards |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-datasets.spec.ts`
