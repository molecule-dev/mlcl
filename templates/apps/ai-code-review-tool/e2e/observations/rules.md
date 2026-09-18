# Page observations: /rules (Custom rules editor)

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/rules`.
> Auth-required. Walked with no rules first (empty state), then created/toggled/deleted.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                            | role        | expected behavior on interaction                                | success signal                                | failure signal                              |
| ----------------------------------------------------- | ----------- | --------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| `getByRole('heading', { name: /^Rules$/ })`           | heading     | renders page heading                                            | h1 visible                                    | missing                                     |
| `[data-mol-id="rules-empty"]`                         | text        | empty-state copy when no rules exist                            | visible after fresh signup                    | populated rows                              |
| `[data-mol-id="rules-create-form"]`                   | form        | create form is always visible                                   | form rendered                                 | missing                                     |
| `[data-mol-id="rules-new-name"]`                      | textbox     | rule-name input (required)                                      | enterable                                     | not focusable                               |
| `[data-mol-id="rules-new-pattern"]`                   | textbox     | regex pattern input (required)                                  | enterable                                     | not focusable                               |
| `[data-mol-id="rules-new-language"]`                  | textbox     | language input                                                  | enterable                                     | not focusable                               |
| `[data-mol-id="rules-new-description"]`               | textbox     | description input (optional)                                    | enterable                                     | not focusable                               |
| severity selector buttons (high/med/low/info/warning) | togglegroup | sets `draft.severity`; aria-pressed flips                       | one button aria-pressed=true                  | nothing happens                             |
| `[data-mol-id="rules-create-btn"]` (Add rule)         | button      | POST `/api/custom-rules`; new row appears + persists            | row visible AND survives `page.reload()`      | no row, no POST, or row gone after reload   |
| invalid regex submit                                  | n/a         | `[data-mol-id="rules-create-error"]` shown; no POST             | error visible, POST count=0                   | POST fires for invalid regex                |
| `[data-mol-id="rule-toggle"]`                         | switch      | flips `enabled` locally; queues PUT in pendingChanges           | aria-pressed flips immediately                | nothing happens                             |
| severity buttons on a row                             | togglegroup | sets `severity` locally; queues PUT                             | aria-pressed updates                          | nothing happens                             |
| `[data-mol-id="rules-save-btn"]` (Save policy)        | button      | PUTs all queued changes; `[data-mol-id="rules-saved-at"]` shown | "Saved …" visible AND backend reflects change | no PUT, or DB still shows old value         |
| `[data-mol-id="rule-delete"]`                         | button      | DELETE `/api/custom-rules/:id`; row removed (optimistic)        | row count decreases AND backend confirms      | DELETE not fired or row reappears on reload |
| Save policy disabled with no pending changes          | button      | `disabled=true` until a change is queued                        | initial render: button is disabled            | button enabled with no queued changes       |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside (selector / role / behavior) |
| ------- | -------------------------------- | -------------------------------------------- |
| (none)  | rules editor has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger           | method | path                    | what request body or query is expected                 |
| ----------------- | ------ | ----------------------- | ------------------------------------------------------ |
| initial load      | GET    | `/api/custom-rules`     | owner-scoped rule list                                 |
| Add rule submit   | POST   | `/api/custom-rules`     | `{ name, pattern, language, severity, enabled }` → 201 |
| Save policy click | PUT    | `/api/custom-rules/:id` | partial body of queued field updates → 200             |
| Delete click      | DELETE | `/api/custom-rules/:id` | 204                                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (name, pattern, language, description, severity)
- [x] Every link href / route destination is documented (no links on this page)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/rules.spec.ts`
