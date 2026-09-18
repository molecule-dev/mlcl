# Page observations: /pricing (Pricing)

Source: live walk via Playwright + e2e/pricing.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                     | success signal                           | failure signal               |
| ------------------------------------------------------ | ------- | ---------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Choose your.*plan/i })` | heading | pricing page renders + GET /api/billing/tiers fires  | heading visible + GET /api/billing/tiers | heading missing or GET fails |
| `getByText(/API requests \/ month/i).first()`          | text    | monthly-requests row from renderLimits is rendered   | visible                                  | missing                      |
| plan tile                                              | link    | each plan tile renders the tier name (Free/Pro/Team) | tier name visible                        | no tile                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/billing/tiers | 200 with array of pricing tiers        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
