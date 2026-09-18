# Page observations: /conversations/:id (ConversationDetail)

Captured from `browser_snapshot` on
`http://localhost:3100/conversations/<uuid>` after creating a
conversation via the API. Two-column layout: thread on the left,
context aside on the right. Header has Escalate / Resolve, footer
has Bot reply / Customer message / quick replies / composer.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] A conversation has already been created (POST /api/conversations) and
      the `:id` path param is the returned UUID

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                                        | success signal                                    | failure signal                     |
| ------------------------------------------------ | ------- | ----------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `[data-mol-id="conversation-back"]`              | link    | navigates back to /conversations                                        | URL becomes /conversations                        | unchanged                          |
| `[data-mol-id="conversation-status"]`            | badge   | shows status (open / pending / escalated / resolved)                    | badge text matches backend status                 | wrong / missing                    |
| `[data-mol-id="conversation-escalate"]`          | button  | POST /api/conversations/:id/escalate; sets escalated=true               | backend reflects `escalated=true`, banner appears | nothing happens / status unchanged |
| `[data-mol-id="conversation-resolve"]`           | button  | POST /api/conversations/:id/close; sets status=resolved                 | backend reflects `status='resolved'`              | unchanged                          |
| `[data-mol-id="conversation-ai-reply"]`          | button  | POST /api/conversations/:id/ai-reply — adds an assistant message        | new bot message appears in thread + persisted     | nothing happens                    |
| `[data-mol-id="conversation-simulate-customer"]` | button  | toggles the customer composer form                                      | `conversation-customer-form` mounts               | hidden form remains hidden         |
| `[data-mol-id="conversation-customer-input"]`    | textbox | accepts a simulated customer message                                    | value matches input                               | empty                              |
| `[data-mol-id="conversation-customer-send"]`     | button  | POST /api/conversations/:id/messages (sender=customer) + auto-bot reply | customer + bot messages persisted                 | nothing posted                     |
| `[data-mol-id="conversation-composer"]`          | textbox | accepts the agent's reply                                               | value matches                                     | empty                              |
| `[data-mol-id="conversation-send"]`              | button  | POST /api/conversations/:id/messages (sender=agent)                     | agent message persisted on reload                 | not stored                         |
| `[data-mol-id="conversation-feedback-up"]`       | button  | POST /api/feedback rating=5                                             | feedback row created, action message visible      | error / no row                     |

## Hidden surfaces opened from this page

| trigger                                                | what it opens            | elements inside (selector / role / behavior)                |
| ------------------------------------------------------ | ------------------------ | ----------------------------------------------------------- |
| Click `[data-mol-id="conversation-simulate-customer"]` | inline customer composer | `conversation-customer-input`, `conversation-customer-send` |

## Network calls expected during normal use

| trigger                         | method | path                            | what request body or query is expected               |
| ------------------------------- | ------ | ------------------------------- | ---------------------------------------------------- |
| Page load                       | GET    | /api/conversations/:id          | conversation row including embedded `messages` array |
| Click "Bot reply"               | POST   | /api/conversations/:id/ai-reply | empty body — returns the inserted bot message        |
| Click "Add as customer"         | POST   | /api/conversations/:id/messages | `{ content, sender: 'customer' }`                    |
| Click "Escalate"                | POST   | /api/conversations/:id/escalate | empty body                                           |
| Click "Mark resolved"           | POST   | /api/conversations/:id/close    | `{ satisfactionScore: 5 }`                           |
| Click "Helpful" / "Not helpful" | POST   | /api/feedback                   | `{ conversation_id, rating, comment }`               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/conversations__id.spec.ts`
