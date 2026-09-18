# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                               | success signal | failure signal |
| ---------------------------------------------------------------- | ------- | -------------------------------------------------------------- | -------------- | -------------- |
| `getByRole("heading", { name: /Choose your.*plan/i, level: 1 })` | heading | render pricing page title                                      | visible        | absent         |
| `getByRole("heading", { name: /^Free$/i, level: 2 })`            | heading | render Free tier card                                          | visible        | absent         |
| `getByRole("heading", { name: /^Pro$/i, level: 2 })`             | heading | render Pro tier card                                           | visible        | absent         |
| `getByRole("heading", { name: /^Team$/i, level: 2 })`            | heading | render Team tier card                                          | visible        | absent         |
| `getByRole("button", { name: /Upgrade to Pro/i })`               | button  | clickable upgrade CTA (POST /api/billing/checkout when authed) | enabled        | disabled       |
| `getByRole("button", { name: /Upgrade to Team/i })`              | button  | clickable upgrade CTA                                          | enabled        | disabled       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| page load     | GET    | /api/billing/tiers    | (none)                                 |
| Upgrade click | POST   | /api/billing/checkout | priceId                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
