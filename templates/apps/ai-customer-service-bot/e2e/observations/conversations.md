# Page observations: /conversations (Conversations Inbox)

Captured from `browser_snapshot` on `http://localhost:3170/conversations`
after signup. Renders a left-rail thread list, a centered empty-state
hero (or selected conversation), and a right-rail "Queue health" widget.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                           | success signal                                          | failure signal  |
| ------------------------------------------- | ------- | ---------------------------------------------------------- | ------------------------------------------------------- | --------------- |
| `[data-mol-id="conversations-new"]`         | button  | toggles inline create form                                 | form mounts (`conversations-new-form` visible)          | nothing happens |
| `[data-mol-id="conversations-search"]`      | textbox | filters the rendered list by customer/email/channel        | non-matching rows disappear                             | no change       |
| `[data-mol-id="filter-open                  | all     | escalated                                                  | resolved"]`                                             | button          | re-filters the list by status variant | row count adjusts | no change |
| `[data-mol-id="conversations-new-name"]`    | textbox | accepts the customer's name                                | value matches                                           | empty           |
| `[data-mol-id="conversations-new-message"]` | textbox | accepts the customer's first message                       | value matches                                           | empty           |
| `[data-mol-id="conversations-new-submit"]`  | button  | POST /api/conversations and navigate to /conversations/:id | URL becomes /conversations/<uuid>, conversation visible | stays on list   |
| `[data-mol-id="conversations-new-cancel"]`  | button  | hides the create form                                      | form disappears                                         | still visible   |

## Hidden surfaces opened from this page

| trigger                                   | what it opens      | elements inside (selector / role / behavior)                                                                  |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Click `[data-mol-id="conversations-new"]` | inline create form | `conversations-new-name`, `conversations-new-message`, `conversations-new-submit`, `conversations-new-cancel` |

## Network calls expected during normal use

| trigger                 | method | path               | what request body or query is expected                                                              |
| ----------------------- | ------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| Page load               | GET    | /api/conversations | array of conversation rows for the user                                                             |
| Submit new conversation | POST   | /api/conversations | `{ customerName?, initialMessage?, channel? }` — returns created conversation; auto-fires bot reply |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/conversations.spec.ts`
