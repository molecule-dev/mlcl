# Page observations: /knowledge/:id (KnowledgeArticleDetail)

Captured from `browser_snapshot` on
`http://localhost:3100/knowledge/<uuid>` after creating an article
via POST /api/knowledge. Two-column layout: full article body on the
left, metadata aside on the right.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] An article has already been created and `:id` is its UUID

## Elements

| selector / accessible name                       | role      | expected behavior on interaction                       | success signal                                        | failure signal   |
| ------------------------------------------------ | --------- | ------------------------------------------------------ | ----------------------------------------------------- | ---------------- |
| `[data-mol-id="page-knowledge-detail"]`          | container | renders the breadcrumb + article shell                 | element visible                                       | missing          |
| `[data-mol-id="knowledge-breadcrumb"]`           | link      | navigates to /knowledge                                | URL becomes /knowledge                                | unchanged        |
| `[data-mol-id="knowledge-detail-title-display"]` | text      | shows the article title from /api/knowledge/:id        | matches `article.title`                               | empty            |
| `[data-mol-id="knowledge-detail-body"]`          | text      | shows the article body                                 | matches article content                               | empty            |
| `[data-mol-id="knowledge-detail-edit"]`          | button    | toggles edit mode (mounts edit form)                   | `knowledge-detail-edit-form` mounts                   | nothing happens  |
| `[data-mol-id="knowledge-detail-title"]`         | textbox   | accepts edited title                                   | value matches                                         | empty            |
| `[data-mol-id="knowledge-detail-content"]`       | textbox   | accepts edited body                                    | value matches                                         | empty            |
| `[data-mol-id="knowledge-detail-save"]`          | button    | PUT /api/knowledge/:id with edits and reloads          | backend reflects new title/body, view exits edit mode | unchanged        |
| `[data-mol-id="knowledge-detail-delete"]`        | button    | shows the delete-confirm dialog                        | `knowledge-delete-confirm` visible                    | nothing happens  |
| `[data-mol-id="knowledge-delete-confirm-yes"]`   | button    | DELETE /api/knowledge/:id then redirects to /knowledge | URL becomes /knowledge, backend GET /:id returns 404  | row still exists |
| `[data-mol-id="knowledge-delete-confirm-no"]`    | button    | dismisses confirm dialog                               | dialog hidden                                         | dialog stays     |

## Hidden surfaces opened from this page

| trigger                                         | what it opens    | elements inside (selector / role / behavior)                                                             |
| ----------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Click `[data-mol-id="knowledge-detail-edit"]`   | inline edit form | `knowledge-detail-title`, `knowledge-detail-content`, `knowledge-detail-status`, `knowledge-detail-save` |
| Click `[data-mol-id="knowledge-detail-delete"]` | confirm dialog   | `knowledge-delete-confirm-yes`, `knowledge-delete-confirm-no`                                            |

## Network calls expected during normal use

| trigger                 | method | path               | what request body or query is expected |
| ----------------------- | ------ | ------------------ | -------------------------------------- |
| Page load               | GET    | /api/knowledge/:id | article row                            |
| Click Save in edit mode | PUT    | /api/knowledge/:id | `{ title, content, body_md, status }`  |
| Confirm delete          | DELETE | /api/knowledge/:id | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/knowledge__id.spec.ts`
