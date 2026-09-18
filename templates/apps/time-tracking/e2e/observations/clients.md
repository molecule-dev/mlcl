# Page observations: /clients (Clients list)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/clients.spec.ts).

> auth-protected list of clients with a roll-up table (projects, hours,
> outstanding, currency). Toggle reveals the create-client form.

## Procedure

1. Sign up first via `signup(page)`.
2. `mcp__playwright__browser_navigate` → `/clients`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive the create-client toggle and form.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/clients.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name        | role        | expected behavior on interaction                                         | success signal                                   | failure signal                 |
| --------------------------------- | ----------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------ |
| `[data-test="clients-page"]`      | container   | renders the page root                                                    | element visible                                  | missing                        |
| `heading "Clients"` (h1)          | heading     | page title                                                               | h1 visible                                       | missing                        |
| `[data-test="new-client-toggle"]` | button      | toggles the create-client form                                           | `[data-test="new-client-form"]` visibility flips | no toggle                      |
| `[data-test="new-client-form"]`   | form        | name, email, currency, default rate                                      | form visible after toggle                        | missing                        |
| `[data-test="client-name"]`       | textbox     | required client name                                                     | typed value preserved                            | submit blocked / accepts empty |
| `[data-test="client-email"]`      | textbox     | optional billing email                                                   | typed value preserved                            | missing                        |
| `[data-test="client-currency"]`   | textbox     | currency code (defaults `USD`)                                           | typed value preserved                            | missing                        |
| `[data-test="client-rate"]`       | spinbutton  | optional default hourly rate (USD)                                       | numeric value preserved                          | missing                        |
| `[data-test="client-submit"]`     | button      | POSTs `/api/clients`; new row appears in list and persists across reload | row visible after submit; persists               | row missing                    |
| `[data-test="clients-empty"]`     | empty-state | shown when user has no clients                                           | element visible for fresh user                   | missing                        |
| `[data-test="client-row-<id>"]`   | link        | per-client row; click opens `/clients/:id`                               | row visible; click navigates                     | missing                        |

## Hidden surfaces opened from this page

| trigger                           | what it opens      | elements inside (selector / role / behavior) |
| --------------------------------- | ------------------ | -------------------------------------------- |
| `[data-test="new-client-toggle"]` | create-client form | name, email, currency, rate, submit, cancel  |

## Network calls expected during normal use

| trigger | method | path         | what request body or query is expected         |
| ------- | ------ | ------------ | ---------------------------------------------- |
| load    | GET    | /api/clients | full client list                               |
| submit  | POST   | /api/clients | { name, email?, currency, hourly_rate_cents? } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/clients.spec.ts`
