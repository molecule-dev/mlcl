# Page observations: /datasets/:id (DatasetDetail)

> Authenticated. Schema/Sample/Insights tabs over a single dataset.
> Sample tab fetches /api/datasets/:id/preview lazily on click.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role   | expected behavior on interaction                           | success signal              | failure signal   |
| -------------------------------------------- | ------ | ---------------------------------------------------------- | --------------------------- | ---------------- |
| `page.locator('tbody tr')`                   | row    | renders the schema rows from /api/datasets/:id             | ≥1 visible                  | empty            |
| `page.locator('aside')`                      | aside  | renders the AI insights aside                              | text contains "AI insights" | missing          |
| `getByRole('button', { name: /^Sample$/i })` | button | switches to Sample tab and fires /api/datasets/:id/preview | preview rows render         | no request fired |

## Hidden surfaces opened from this page

| trigger           | what it opens        | elements inside  |
| ----------------- | -------------------- | ---------------- |
| Sample tab button | sample preview panel | sample-row table |

## Network calls expected during normal use

| trigger          | method | path                      | expected body       |
| ---------------- | ------ | ------------------------- | ------------------- |
| Page load        | GET    | /api/datasets/:id         | full dataset detail |
| Sample tab click | GET    | /api/datasets/:id/preview | sample rows         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-datasets__id.spec.ts`
