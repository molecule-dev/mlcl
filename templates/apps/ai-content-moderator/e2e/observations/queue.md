# Page observations: /queue (Queue)

Source: live walk via Playwright + e2e/queue.spec.ts. Each row maps
to an element exercised by a passing test that asserts on the real
outcome (state-change persistence, navigation, query-param updates).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                     | role                       | expected behavior on interaction                                                         | success signal                                      | failure signal      |
| ------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------- |
| KPIs + table render on initial load                                            | section                    | page renders Queue heading + table headers + KPI tiles after `/api/moderation` GET       | heading visible, table headers visible              | empty page, 5xx     |
| empty-state row                                                                | row                        | when there are no items, table shows empty row                                           | empty-state row visible                             | unexpected rows     |
| seeded item shows in the table                                                 | row                        | a freshly-seeded `content_preview` appears in the table                                  | preview visible in row                              | row missing         |
| filter buttons (`/^all\|pending\|reviewing\|escalated\|rejected\|approved$/i`) | button group               | clicking each filter sets `?filter=<key>` and toggles `aria-pressed`                     | URL + aria-pressed update per filter                | URL unchanged       |
| bulk-approve flow (select-all + Approve)                                       | checkbox + button          | items flip from queued/in_review → decision=approve via POST /api/moderation/:id/approve | next GET shows `decision: 'approve'`                | items remain queued |
| bulk-reject flow (select-all + Reject + reason)                                | checkbox + button + select | items flip to decision=reject via POST /api/moderation/:id/reject with `{reason}`        | next GET shows `decision: 'reject'`                 | items remain queued |
| row link to /queue/:id                                                         | link                       | clicking a row title navigates to the detail page                                        | URL becomes `/queue/<uuid>`, detail heading visible | URL unchanged       |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                          | what request body or query is expected |
| ------------ | ------ | ----------------------------- | -------------------------------------- |
| initial load | GET    | /api/moderation               | 200 with array of flagged_content rows |
| initial load | GET    | /api/moderation/stats/summary | 200 with KPI counts                    |
| bulk approve | POST   | /api/moderation/:id/approve   | empty body, 200 per id                 |
| bulk reject  | POST   | /api/moderation/:id/reject    | { reason } body, 200 per id            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/queue.spec.ts`
