# Page observations: /clients/:id (Client detail)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/clients__id.spec.ts).

> auth-protected per-client view: avatar / overview, KPI strip
> (Total hours / Total paid / Outstanding / Active projects),
> Projects list, Recent invoices.

## Procedure

1. Sign up first via `signup(page)`; seed a client (+ optional project).
2. `mcp__playwright__browser_navigate` → `/clients/:id`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive "New invoice" CTA.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/clients__id.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); a client must exist.

## Elements

| selector / accessible name                               | role        | expected behavior on interaction               | success signal                   | failure signal |
| -------------------------------------------------------- | ----------- | ---------------------------------------------- | -------------------------------- | -------------- |
| `[data-test="client-detail"]`                            | container   | renders the client root                        | element visible                  | missing        |
| `link "Clients"` (breadcrumb, `/clients`)                | link        | back to list                                   | URL ends `/clients`              | no nav         |
| `heading "<client name>"` (h1)                           | heading     | client name                                    | h1 visible                       | missing        |
| `[data-test="client-new-invoice"]` (`/invoices`)         | link        | jumps to invoices page (acts as "New invoice") | URL ends `/invoices`             | no nav         |
| KPI cell "Total hours"                                   | text        | tracked hours summed across the client         | text visible (default `0h 00m`)  | missing        |
| KPI cell "Total paid"                                    | text        | paid invoice revenue                           | dollar text visible              | missing        |
| KPI cell "Outstanding"                                   | text        | unpaid invoice revenue                         | dollar text visible              | missing        |
| KPI cell "Active projects"                               | text        | live project count                             | numeric value visible            | missing        |
| `heading "Projects"` (h2)                                | heading     | renders the projects section                   | h2 visible                       | missing        |
| `[data-test="client-projects-empty"]` (when no projects) | empty-state | empty copy when client has no projects         | element visible for fresh client | missing        |
| `heading "Recent invoices"` (h2)                         | heading     | renders the invoices section                   | h2 visible                       | missing        |
| `[data-test="client-invoices-empty"]` (when no invoices) | empty-state | empty copy when client has no invoices         | element visible for fresh client | missing        |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                        | what request body or query is expected |
| ------- | ------ | --------------------------- | -------------------------------------- |
| load    | GET    | /api/clients/:id            | the client record                      |
| load    | GET    | /api/projects?client_id=... | projects scoped to this client         |
| load    | GET    | /api/entries?client_id=...  | entries summed for this client         |
| load    | GET    | /api/invoices?client_id=... | invoices for this client               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/clients__id.spec.ts`
