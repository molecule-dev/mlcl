# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name       | role     | expected behavior on interaction          | success signal                  | failure signal         |
| -------------------------------- | -------- | ----------------------------------------- | ------------------------------- | ---------------------- |
| Pricing heading                  | heading  | renders Pricing page heading              | heading visible                 | absent                 |
| Plan cards (Free / Pro / Family) | listitem | render each tier name + price + bullets   | three cards visible             | only one card or empty |
| Tier select / checkout CTA       | button   | (when authed) POSTs /api/billing/checkout | redirects or shows checkout url | network error          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger           | method | path                | what request body or query is expected |
| ----------------- | ------ | ------------------- | -------------------------------------- |
| Page mount (auth) | GET    | /api/billing/tiers  | (none) — returns plans + limits        |
| Page mount (auth) | GET    | /api/billing/status | (none) — returns current plan          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
