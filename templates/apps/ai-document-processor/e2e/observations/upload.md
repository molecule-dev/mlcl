# Page observations: /upload (Upload)

> Authenticated ingestion surface. UploadDropZone fires the file
> input on click. POST /api/documents/upload runs the real
> Anthropic-backed pipeline (OCR → classify → extract → summarize → S3).
> Each batch row's status flips queued → processing → complete (or error).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction | success signal      | failure signal      |
| ------------------------------------------------ | ------- | -------------------------------- | ------------------- | ------------------- |
| `[data-mol-id="upload-page"]`                    | region  | renders Upload page container    | visible             | hidden              |
| `getByText(/nothing in the queue/i)`             | text    | empty-state row in queue table   | shown when no files | hidden after upload |
| `[data-mol-id="upload-page"] input[type="file"]` | textbox | accepts file via setInputFiles   | adds queue row      | no row              |
| `[data-mol-id="upload-clear-queue"]`             | button  | drops complete/error rows        | empty-state returns | rows persist        |
| Queue row file column                            | text    | renders the original filename    | filename visible    | absent              |

## Hidden surfaces opened from this page

| trigger           | what it opens                                 | elements inside                             |
| ----------------- | --------------------------------------------- | ------------------------------------------- |
| File input change | runs upload promise → updates queue row state | progress bar, status pill, confidence badge |

## Network calls expected during normal use

| trigger        | method | path                  | expected body            |
| -------------- | ------ | --------------------- | ------------------------ |
| File submitted | POST   | /api/documents/upload | multipart/form-data file |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-upload.spec.ts`
