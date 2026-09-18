# Page observations: /rules (Rules) — covered by 09-rules.spec.ts

> Authenticated automation surface. On mount fires GET /api/extraction-rules
> and GET /api/extraction-templates in parallel. "New rule" toggles an
> inline form (name + matchedType select + destination), submitting POSTs
> /api/extraction-rules and the new card prepends to the list. Each rule
> card has a sr-only checkbox toggle inside a styled label that fires
> PATCH /api/extraction-rules/:id with `{ enabled }`. Templates section
> renders cards from `/api/extraction-templates`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction            | success signal                           | failure signal    |
| ------------------------------------------------ | -------- | ------------------------------------------- | ---------------------------------------- | ----------------- |
| `[data-mol-id="rules-page"]`                     | region   | renders rules container                     | visible                                  | hidden            |
| `[data-mol-id="rules-empty"]`                    | text     | empty-state row before any rule exists      | visible on fresh account                 | absent            |
| `[data-mol-id="rules-new"]`                      | button   | toggles the new-rule form open/close        | `[data-mol-id="rules-new-form"]` visible | form stays hidden |
| `[data-mol-id="rules-form-name"]`                | textbox  | accepts rule name                           | typed value reflects                     | empty             |
| `[data-mol-id="rules-form-type"]`                | combobox | selects DocumentType                        | option value updates                     | unchanged         |
| `[data-mol-id="rules-form-destination"]`         | textbox  | accepts destination path                    | typed value reflects                     | empty             |
| `[data-mol-id="rules-form-submit"]`              | button   | POST /api/extraction-rules → prepends card  | new rule card visible, GET reflects      | 4xx, no card      |
| `[data-mol-id^="rule-"]` (rule card)             | region   | renders an existing rule                    | visible after creation                   | absent            |
| `[data-mol-id^="rule-"][data-mol-id$="-toggle"]` | checkbox | PATCH /api/extraction-rules/:id `{enabled}` | persists across reload                   | unchanged         |

## Hidden surfaces opened from this page

| trigger          | what it opens        | elements inside                                    |
| ---------------- | -------------------- | -------------------------------------------------- |
| Click "New rule" | inline new-rule form | name input, type select, destination input, submit |

## Network calls expected during normal use

| trigger              | method | path                      | expected body                                       |
| -------------------- | ------ | ------------------------- | --------------------------------------------------- |
| Page load            | GET    | /api/extraction-rules     | array of rule rows                                  |
| Page load            | GET    | /api/extraction-templates | array of templates                                  |
| Submit new-rule form | POST   | /api/extraction-rules     | `{ name, matchedType, destination, enabled: true }` |
| Toggle rule          | PATCH  | /api/extraction-rules/:id | `{ enabled: boolean }`                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-rules.spec.ts`
