# Page observations: /pricing (Public pricing page)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/pricing. Public.

## Page state assumed

- [x] Public (no auth required) — upgrade CTA prompts sign-in if anonymous

## Elements

| selector / accessible name                                          | role           | expected behavior on interaction                                                        | success signal          | failure signal |
| ------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- | ----------------------- | -------------- |
| `getByRole('heading', { level: 1 })` ("Choose your WriteFlow plan") | heading        | renders page title                                                                      | visible                 | missing        |
| Free tier card                                                      | region         | shows Free tier name + limits                                                           | visible                 | missing        |
| Pro tier card                                                       | region         | shows Pro tier name + monthly price + limits                                            | visible                 | missing        |
| Team tier card                                                      | region         | shows Team tier name + monthly price + limits                                           | visible                 | missing        |
| Each tier limit list `<ul><li>`                                     | list           | enumerates max posts / comments / storage / tags / scheduling / AI / analytics / export | bulleted limits visible | missing        |
| `getByRole('button', { name: /upgrade                               | subscribe      | get pro                                                                                 | get team/i })`          | button         | starts checkout via POST /api/billing/checkout | response url contains checkout.stripe.com | error toast / disabled |
| Free tier CTA "Current plan" / "Get started"                        | button or link | navigates to /signup if anonymous, disabled if free                                     | URL changes or disabled | nothing        |
| Period toggle (month / year) — if rendered                          | switch         | toggles between month/year prices                                                       | prices switch in DOM    | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger          | method | path                  | what request body or query is expected             |
| ---------------- | ------ | --------------------- | -------------------------------------------------- |
| page load        | GET    | /api/billing/tiers    | array of {key, name, price, stripePriceId, limits} |
| page load (auth) | GET    | /api/billing/me       | current plan                                       |
| upgrade click    | POST   | /api/billing/checkout | { stripePriceId } returns { url }                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
