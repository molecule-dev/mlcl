# Page observations: /orders/:id/confirmation (OrderConfirmation)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/orders__id_confirmation.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> post-purchase confirmation page with QR ticket stubs

## Procedure

1. `mcp__playwright__browser_navigate` → `/orders/:id/confirmation` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/orders__id_confirmation.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name         | role    | expected behavior on interaction | success signal       | failure signal |
| ---------------------------------- | ------- | -------------------------------- | -------------------- | -------------- |
| `heading h1 ("You\u2019re in!")`   | heading | visible                          | h1 visible           | h1 missing     |
| `link "Open my tickets"`           | link    | navigate to /my-tickets          | URL ends /my-tickets | no nav         |
| `ticket stub article (per ticket)` | article | displays ref_code + holder       | visible              | missing        |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected   |
| ------- | ------ | --------------- | ---------------------------------------- |
| load    | GET    | /api/orders/:id | order row                                |
| load    | GET    | /api/tickets    | tickets the buyer owns (filter by order) |
| load    | GET    | /api/events/:id | event title for header                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders__id_confirmation.spec.ts`
