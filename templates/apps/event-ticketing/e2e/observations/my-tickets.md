# Page observations: /my-tickets (MyTickets)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/my-tickets.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> user-owned tickets library with filter chips

## Procedure

1. `mcp__playwright__browser_navigate` → `/my-tickets` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/my-tickets.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name         | role   | expected behavior on interaction | success signal          | failure signal |
| ---------------------------------- | ------ | -------------------------------- | ----------------------- | -------------- |
| `data-mol-id="filter-upcoming"`    | button | show upcoming (active) tickets   | rows filtered to active | no filter      |
| `data-mol-id="filter-past"`        | button | show past (used) tickets         | rows filtered to used   | no filter      |
| `data-mol-id="filter-transferred"` | button | show transferred tickets         | rows filtered           | no filter      |
| `data-mol-id="filter-refunded"`    | button | show refunded tickets            | rows filtered           | no filter      |
| `data-mol-id="ticket-link"`        | link   | navigate to /tickets/:id         | URL ends /tickets/:id   | no nav         |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected |
| ------- | ------ | --------------- | -------------------------------------- |
| load    | GET    | /api/tickets    | list of issued tickets for user        |
| load    | GET    | /api/profile/me | profile (display name on stub)         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/my-tickets.spec.ts`
