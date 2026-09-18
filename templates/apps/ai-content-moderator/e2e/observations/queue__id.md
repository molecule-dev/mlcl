# Page observations: /queue/:id (ReviewDetail)

Source: live walk via Playwright + e2e/queue__id.spec.ts. The AI
review row is exercised by a real Anthropic call (no mocks); the
approve / reject rows are verified by reading flagged_content back
from the API after the action.

## Page state assumed

- [x] Authenticated (and the :id must belong to the signed-in user)

## Elements

| selector / accessible name                                                        | role   | expected behavior on interaction                                                                            | success signal                                                                                          | failure signal                                 |
| --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| seeded `content_preview` rendered on the detail page                              | text   | the preview text from the seeded item is visible                                                            | text visible within 10s                                                                                 | text missing                                   |
| `getByRole('button', { name: /run ai review/i })`                                 | button | POST /api/moderation/:id/ai-review → real Anthropic call, persists ai_reviews row                           | recommendation panel appears, model is real (not "preview-1.0"), `decision ∈ {approve,reject,escalate}` | error toast / 502                              |
| `getByRole('button', { name: /approve content/i })`                               | button | POST /api/moderation/:id/approve persists decision=approve and creates audit_log row; survives reload       | next GET → `decision: 'approve'`, audit_log row, page shows decided badge after reload                  | error toast, decision unchanged                |
| `getByRole('button', { name: /^reject content$/i })` + `#reject-reason` + confirm | flow   | reject button reveals reason select; confirm disabled until reason chosen; submitting flips decision=reject | next GET → `decision: 'reject'`, status='decided'                                                       | confirm enables w/o reason or no decision flip |

## Hidden surfaces opened from this page

| trigger       | what it opens                                 | elements inside (selector / role / behavior)                                                  |
| ------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Reject button | reject-reason select + confirm/cancel buttons | reason select (required), confirm reject button (disabled until reason chosen), cancel button |

## Network calls expected during normal use

| trigger            | method | path                                                     | what request body or query is expected                                              |
| ------------------ | ------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| initial load       | GET    | /api/moderation/:id                                      | 200 with flagged_content + ai_reviews + audit_log                                   |
| Run AI review      | POST   | /api/moderation/:id/ai-review                            | empty body → 200 with real Anthropic verdict {decision, confidence, reasoning, ...} |
| Approve            | POST   | /api/moderation/:id/approve                              | { notes? } → 200                                                                    |
| Reject             | POST   | /api/moderation/:id/reject                               | { reason, notes? } → 200                                                            |
| Audit verification | GET    | /api/audit-log?target_type=flagged_content&target_id=:id | 200 with rows scoped to current user                                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/queue__id.spec.ts`
