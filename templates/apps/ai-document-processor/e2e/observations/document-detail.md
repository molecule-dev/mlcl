# Page observations: /documents/:id (DocumentDetail) — covered by 07-document-detail.spec.ts

> Authenticated detail view. GET /api/documents/:id (with extracted_fields
>
> - events). Two-pane layout: preview on the left, extracted fields panel
>   on the right. AI summary card and audit timeline below.

## Page state assumed

- [x] Authenticated AND a real document uploaded via `uploadInvoice(page)`

## Elements

| selector / accessible name                | role    | expected behavior on interaction                       | success signal                                          | failure signal          |
| ----------------------------------------- | ------- | ------------------------------------------------------ | ------------------------------------------------------- | ----------------------- |
| `[data-mol-id="document-detail-page"]`    | region  | renders the detail container                           | visible                                                 | hidden                  |
| `[data-mol-id="document-detail-title"]`   | heading | shows the original filename                            | text equals upload name                                 | empty                   |
| `[data-mol-id="document-detail-back"]`    | link    | nav to /documents                                      | URL becomes /documents                                  | stays                   |
| `[data-mol-id="document-zoom-in"]`        | button  | bumps zoom up (~10%)                                   | `[data-mol-id="document-zoom-level"]` text changes      | no change               |
| `[data-mol-id="document-zoom-out"]`       | button  | bumps zoom down                                        | indicator changes                                       | no change               |
| `[data-mol-id="document-prev-page"]`      | button  | previous page (disabled at 1)                          | indicator updates if multi-page                         | unchanged at 1/1        |
| `[data-mol-id="document-next-page"]`      | button  | next page                                              | indicator updates if multi-page                         | unchanged at end        |
| `[data-mol-id="document-rotate"]`         | button  | rotates preview 90°                                    | preview transform updates                               | unchanged               |
| `[data-mol-id="document-reprocess"]`      | button  | POST /api/processing/documents/:id/reprocess + refresh | "Reprocess queued." note + audit timeline updates       | error note              |
| `[data-mol-id="document-download"]`       | button  | opens /api/documents/:id/download                      | new tab with attachment                                 | error toast             |
| `button[data-mol-id^="document-field-"]`  | button  | clicks an extracted field → toggles highlight          | `[data-mol-id="document-field-highlight"]` visible/gone | no toggle               |
| `[data-mol-id="document-summary-card"]`   | region  | renders AI summary                                     | visible after Anthropic processing                      | absent or "Processing…" |
| `[data-mol-id="document-audit-timeline"]` | region  | renders audit events incl. "ready"                     | timeline includes `ready` token                         | empty/missing           |

## Hidden surfaces opened from this page

| trigger            | what it opens                       | elements inside                                |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| Field button click | inline highlight overlay on preview | `[data-mol-id="document-field-highlight"]` div |

## Network calls expected during normal use

| trigger           | method | path                                    | expected body                                   |
| ----------------- | ------ | --------------------------------------- | ----------------------------------------------- |
| Page load         | GET    | /api/documents/:id                      | full record with fields + events                |
| Download click    | GET    | /api/documents/:id/download             | binary file body                                |
| Reprocess click   | POST   | /api/processing/documents/:id/reprocess | `{ steps: ['extract','classify','summarize'] }` |
| Reprocess refresh | GET    | /api/documents/:id                      | refreshed record (status + events)              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-document-detail.spec.ts`
