# Page observations: /upload (Upload)

> Authenticated. Drop-zone parses CSV/JSON client-side and POSTs the
> structured payload to /api/datasets/from_upload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role   | expected behavior on interaction                 | success signal  | failure signal        |
| ------------------------------------ | ------ | ------------------------------------------------ | --------------- | --------------------- |
| `page.locator('input[type="file"]')` | input  | accepts a CSV/JSON file                          | input has files | input rejects file    |
| `page.locator('main')`               | main   | renders the upload zone heading and instructions | visible         | missing               |
| `getByRole('link', { name: /datasets | cancel | back/i })`                                       | link            | nav back to /datasets | URL becomes `/datasets` | stays on `/upload` |

## Hidden surfaces opened from this page

| trigger        | what it opens     | elements inside                                      |
| -------------- | ----------------- | ---------------------------------------------------- |
| File selection | parse + POST flow | progress indicator, navigation to new dataset detail |

## Network calls expected during normal use

| trigger             | method | path                      | expected body                                              |
| ------------------- | ------ | ------------------------- | ---------------------------------------------------------- |
| File select         | POST   | /api/datasets/from_upload | `{ name, columns, sample_rows, row_count, ... }`           |
| (optional alt path) | POST   | /api/uploads              | direct S3 upload (currently bypassed in client-parse mode) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-upload.spec.ts`
