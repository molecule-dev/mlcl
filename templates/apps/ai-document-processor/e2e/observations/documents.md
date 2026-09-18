# Page observations: /documents (Documents)

> Authenticated library view. GET /api/documents on mount → renders
> filter chips + search input + grid of DocumentCards. Empty state
> says "No documents match the current filters."

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction               | success signal                 | failure signal                |
| ---------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------ | ----------------------------- |
| `[data-mol-id="documents-page"]`               | region  | renders library container                      | visible                        | hidden                        |
| `[data-mol-id="documents-upload-cta"]`         | link    | nav to /upload                                 | URL becomes /upload            | stays                         |
| `getByRole('button', { name: /^all$/i })`      | button  | sets filter to "all" → re-renders grid         | active state on button         | filter doesn't apply          |
| `getByRole('button', { name: /^receipts$/i })` | button  | sets filter to "receipt" → grid hides invoices | "no documents match" when none | grid still shows non-receipts |
| `[data-mol-id="documents-search"]`             | textbox | filters by filename substring                  | matching cards remain          | mismatched cards hidden       |

## Hidden surfaces opened from this page

| trigger                 | what it opens               | elements inside               |
| ----------------------- | --------------------------- | ----------------------------- |
| Click DocumentCard link | navigates to /documents/:id | (covered by documents__id.md) |

## Network calls expected during normal use

| trigger   | method | path           | expected body               |
| --------- | ------ | -------------- | --------------------------- |
| Page load | GET    | /api/documents | array of document summaries |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-documents.spec.ts`
