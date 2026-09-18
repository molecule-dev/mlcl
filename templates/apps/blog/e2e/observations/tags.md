# Page observations: /tags (Tags management)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/tags. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role      | expected behavior on interaction                          | success signal                          | failure signal        |
| ----------------------------------------- | --------- | --------------------------------------------------------- | --------------------------------------- | --------------------- |
| `[data-mol-id="page-tags"]`               | container | wraps the tags page                                       | visible                                 | missing               |
| Stats card "Total Tags"                   | region    | shows tags.length                                         | numeric value rendered                  | missing               |
| Stats card "Tagged Posts"                 | region    | shows sum of post counts                                  | numeric value rendered                  | missing               |
| Stats card "Most Used"                    | region    | shows the most-used tag name                              | non-empty                               | dash when no tags     |
| `[data-mol-id="input-search-tags"]`       | search    | filters tags by name                                      | typed text filters list                 | not editable          |
| `[data-mol-id="select-sort-tags"]`        | combobox  | changes sort order (most-used / alpha / recent)           | option selected, list re-sorts          | unchanged             |
| `[data-mol-id="btn-filter"]`              | button    | cycles through sort orders + updates URL ?sort=…          | URL updates, list re-sorts              | unchanged             |
| `[data-mol-id="btn-create-tag"]`          | button    | opens create-tag modal                                    | `[data-mol-id="new-tag-modal"]` visible | unchanged             |
| `[data-mol-id="tags-table"]`              | table     | renders paginated tag rows                                | rows visible                            | empty when populated  |
| `[data-mol-id^="tag-row-"]`               | row       | one row per tag (name / slug / posts / created / actions) | rows visible                            | rows missing          |
| `[data-mol-id^="button-edit-"]`           | button    | opens edit-tag modal pre-filled                           | modal opens with name+color             | unchanged             |
| `[data-mol-id^="button-delete-"]`         | button    | DELETE /api/tags/:id                                      | row disappears                          | row remains           |
| `[data-mol-id="btn-page-prev"]`           | button    | pagination prev (disabled on page 1)                      | page decrements                         | unchanged             |
| `[data-mol-id="btn-page-next"]`           | button    | pagination next (disabled on last page)                   | page increments                         | unchanged             |
| `[data-mol-id="empty-tags"]`              | region    | empty-state when sorted.length === 0                      | visible                                 | hidden when populated |
| `[data-mol-id="button-create-first-tag"]` | button    | empty-state CTA → opens create modal                      | modal opens                             | unchanged             |
| `[data-mol-id="tip-section"]`             | region    | Editor's tip card                                         | visible                                 | missing               |

## Hidden surfaces opened from this page

| trigger                          | what it opens                   | elements inside                                                                                                                                 |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `[data-mol-id="btn-create-tag"]` | `[data-mol-id="new-tag-modal"]` | `input-tag-name`, `input-tag-slug` (auto-generated), 8 color swatches `color-swatch-*`, `btn-modal-cancel`, `btn-modal-save`, `btn-modal-close` |
| `[data-mol-id^="button-edit-"]`  | edit-tag modal                  | same fields, prefilled with the row's name + color                                                                                              |

## Network calls expected during normal use

| trigger             | method | path          | what request body or query is expected         |
| ------------------- | ------ | ------------- | ---------------------------------------------- |
| page load           | GET    | /api/tags     | array of {id,name,color,post_count,created_at} |
| modal Save (create) | POST   | /api/tags     | { name, color }                                |
| modal Save (edit)   | PATCH  | /api/tags/:id | { name, color }                                |
| row Delete          | DELETE | /api/tags/:id | no body                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/tags.spec.ts`
