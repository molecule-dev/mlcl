# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role                    | expected behavior on interaction                                         | success signal                            | failure signal                |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------- | ----------------------------- |
| `getByRole("heading", { name: /plan            | pricing/i, level: 1 })` | heading                                                                  | renders pricing heading                   | visible h1                    | missing heading |
| tier card list (rendered by PricingPage)       | list                    | shows at least the free + at least one paid tier from /api/billing/tiers | ≥2 tier cards visible                     | empty page / spinner stuck    |
| limits list per tier (cards/decks/stats/study) | list                    | renders limit values from getPricingTiers()                              | limit text matches free→starter→pro shape | all limits show 0 / undefined |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| load /pricing | GET    | /api/billing/tiers | no body; response { data: [tiers] }    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
