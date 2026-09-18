# Page observations: /events/:id/attendees (Attendees)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/events__id_attendees.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> organizer view of attendees with search, filter, and CSV export

## Procedure

1. `mcp__playwright__browser_navigate` → `/events/:id/attendees` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/events__id_attendees.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name        | role      | expected behavior on interaction  | success signal            | failure signal |
| --------------------------------- | --------- | --------------------------------- | ------------------------- | -------------- |
| `data-mol-id="attendees-search"`  | searchbox | narrows attendee list client-side | rows filter               | no filter      |
| `data-mol-id="filter-checked_in"` | button    | show only checked-in attendees    | rows filtered             | no filter      |
| `data-mol-id="filter-pending"`    | button    | show only pending attendees       | rows filtered             | no filter      |
| `data-mol-id="filter-all"`        | button    | reset filter to all               | all rows shown            | no change      |
| `data-mol-id="attendees-export"`  | button    | download CSV of attendees         | browser download triggers | no download    |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                     | what request body or query is expected |
| ------- | ------ | ------------------------ | -------------------------------------- |
| load    | GET    | /api/events/:id          | event title                            |
| load    | GET    | /api/attendees/:event_id | attendee list                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/events__id_attendees.spec.ts`
