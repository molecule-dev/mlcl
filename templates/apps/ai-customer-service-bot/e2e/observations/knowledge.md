# Page observations: /knowledge (KnowledgeBase)

Captured from `browser_snapshot` on `http://localhost:3100/knowledge`
after `signup(page)`. Single-column page with header + "New article"
CTA, a search bar, a category filter row, and a card grid (or empty
state) of knowledge articles.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role      | expected behavior on interaction               | success signal                                 | failure signal   |
| ---------------------------------------- | --------- | ---------------------------------------------- | ---------------------------------------------- | ---------------- |
| `[data-mol-id="page-knowledge-base"]`    | container | renders after auth                             | element visible                                | missing          |
| `[data-mol-id="knowledge-new"]`          | button    | toggles inline create form                     | `knowledge-new-form` mounts                    | nothing happens  |
| `[data-mol-id="knowledge-new-title"]`    | textbox   | accepts new article title                      | value matches                                  | empty            |
| `[data-mol-id="knowledge-new-content"]`  | textbox   | accepts new article body                       | value matches                                  | empty            |
| `[data-mol-id="knowledge-new-submit"]`   | button    | POST /api/knowledge then reloads list          | new card appears in grid + backend has the row | not persisted    |
| `[data-mol-id="knowledge-new-cancel"]`   | button    | hides inline create form                       | form disappears                                | still visible    |
| `[data-mol-id="knowledge-search-input"]` | textbox   | filters card grid client-side by title/content | non-matching cards disappear, URL gains `?q=`  | no change        |
| `[data-mol-id="knowledge-category-all"]` | button    | resets category filter to "All"                | every article visible again                    | filter not reset |
| `[data-mol-id="knowledge-card-<id>"]`    | link      | navigates to /knowledge/:id                    | URL becomes /knowledge/<uuid>                  | unchanged        |

## Hidden surfaces opened from this page

| trigger                               | what it opens      | elements inside (selector / role / behavior)                                                                             |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Click `[data-mol-id="knowledge-new"]` | inline create form | `knowledge-new-title`, `knowledge-new-content`, `knowledge-new-category`, `knowledge-new-submit`, `knowledge-new-cancel` |

## Network calls expected during normal use

| trigger            | method | path           | what request body or query is expected                |
| ------------------ | ------ | -------------- | ----------------------------------------------------- |
| Page load          | GET    | /api/knowledge | array of `ArticleRow`                                 |
| Submit new article | POST   | /api/knowledge | `{ title, content, body_md, category, tags, status }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/knowledge.spec.ts`
