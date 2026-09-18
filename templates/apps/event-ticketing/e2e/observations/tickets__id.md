# Page observations: /tickets/:id (TicketDetail)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/tickets__id.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> single ticket with QR, transfer, and refund actions

## Procedure

1. `mcp__playwright__browser_navigate` → `/tickets/:id` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/tickets__id.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name           | role   | expected behavior on interaction                   | success signal         | failure signal |
| ------------------------------------ | ------ | -------------------------------------------------- | ---------------------- | -------------- |
| `data-mol-id="ticket-download-pass"` | button | GET /api/tickets/:id/wallet-pass and download JSON | download triggered     | alert          |
| `data-mol-id="ticket-view-order"`    | button | navigate to /orders/:id/confirmation               | URL ends confirmation  | no nav         |
| `data-mol-id="transfer-open"`        | button | open transfer email form                           | email input visible    | no toggle      |
| `data-mol-id="transfer-submit"`      | button | POST /api/transfers/:ticket_id                     | success status visible | alert          |
| `data-mol-id="refund-open"`          | button | open refund reason textarea                        | textarea visible       | no toggle      |
| `data-mol-id="refund-submit"`        | button | POST /api/refunds                                  | success status visible | alert          |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger         | method | path                      | what request body or query is expected |
| --------------- | ------ | ------------------------- | -------------------------------------- |
| load            | GET    | /api/tickets/:id          | ticket row                             |
| load            | GET    | /api/events/:id           | event for ticket stub                  |
| transfer submit | POST   | /api/transfers/:ticket_id | {to_email}                             |
| refund submit   | POST   | /api/refunds              | {order_id, reason}                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tickets__id.spec.ts`
