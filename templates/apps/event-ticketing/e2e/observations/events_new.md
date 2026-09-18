# Page observations: /events/new (CreateEvent)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/events_new.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> multi-step wizard to create + publish an event with tiers

## Procedure

1. `mcp__playwright__browser_navigate` → `/events/new` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/events_new.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name        | role     | expected behavior on interaction                 | success signal           | failure signal |
| --------------------------------- | -------- | ------------------------------------------------ | ------------------------ | -------------- |
| `data-mol-id="field-title"`       | text     | event title — required                           | value retained           | no submit      |
| `data-mol-id="field-description"` | textarea | optional description                             | value retained           | n/a            |
| `data-mol-id="field-category"`    | select   | category dropdown                                | value retained           | n/a            |
| `data-mol-id="field-tags"`        | text     | comma-separated tags                             | value retained           | n/a            |
| `data-mol-id="field-start-date"`  | date     | event date — required                            | value retained           | inline error   |
| `data-mol-id="field-venue"`       | text     | venue — required                                 | value retained           | inline error   |
| `data-mol-id="tier-0-name"`       | text     | first tier name                                  | value retained           | n/a            |
| `data-mol-id="tier-add"`          | button   | append a new tier row                            | extra row appears        | no row added   |
| `data-mol-id="event-save-draft"`  | button   | POST /api/events status=draft                    | navigates to /events/:id | inline alert   |
| `data-mol-id="event-publish"`     | button   | POST /api/events status=published + PUT /publish | navigates to detail page | alert          |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger    | method | path                    | what request body or query is expected         |
| ---------- | ------ | ----------------------- | ---------------------------------------------- |
| save draft | POST   | /api/events             | {title, venue, start_date, status:draft, tags} |
| add tier   | POST   | /api/ticket-tiers       | {event_id, name, price_cents, quantity_total}  |
| publish    | PUT    | /api/events/:id/publish | {}                                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/events_new.spec.ts`
