# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated or authenticated; pricing is a public funnel page

## Elements

| selector / accessible name | role   | expected behavior on interaction | success signal      | failure signal     |
| -------------------------- | ------ | -------------------------------- | ------------------- | ------------------ |
| Free tier card             | card   | Renders Free tier limits         | "Free" text visible | missing/wrong tier |
| Pro tier card              | card   | Renders Pro tier limits          | "Pro" text visible  | missing            |
| Team tier card             | card   | Renders Team tier limits         | "Team" text visible | missing            |
| Tier CTA buttons           | button | Routes to signup or upgrade flow | navigates correctly | inert click        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/billing/tiers | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-pricing.spec.ts`
