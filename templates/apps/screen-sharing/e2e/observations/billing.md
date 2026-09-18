# Page observations: /billing (Billing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name              | role   | expected behavior on interaction | success signal                     | failure signal                 |
| --------------------------------------- | ------ | -------------------------------- | ---------------------------------- | ------------------------------ |
| Current plan card                       | card   | Renders status.name              | "Free" visible for new users       | missing                        |
| Usage cards (recordings/comments/views) | list   | Render usage vs limit            | numbers visible                    | missing/zero on populated user |
| Tier card "Pro"                         | card   | Renders Pro tier with prices     | "Pro" + "$15/mo" visible           | missing                        |
| Tier card "Team"                        | card   | Renders Team tier with prices    | "Team" + "$49/mo" visible          | missing                        |
| Period toggle (Monthly/Yearly)          | tab    | Switches displayed price         | price text changes                 | inert                          |
| Upgrade button                          | button | POST /api/billing/checkout       | redirects or returns updated state | inert                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| page load | GET    | /api/billing/status   | auth header only                       |
| page load | GET    | /api/billing/tiers    | auth header only                       |
| upgrade   | POST   | /api/billing/checkout | { priceId }                            |
| cancel    | POST   | /api/billing/cancel   | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-billing.spec.ts`
