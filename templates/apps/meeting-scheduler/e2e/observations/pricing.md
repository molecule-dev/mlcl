# Page observations: /pricing (Pricing)

Public pricing page sourced from /api/billing/tiers (the entitlements bond).

Source: this page was driven live at `http://localhost:$VITE_PORT/pricing`
via Playwright + the matching `e2e/pricing.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name           | role    | expected behavior on interaction | success signal     | failure signal  |
| ------------------------------------ | ------- | -------------------------------- | ------------------ | --------------- |
| `getByRole("heading", { level: 1 })` | heading | top-level pricing heading        | h1 visible         | heading missing |
| `getByText(/free/i)`                 | text    | free-tier card renders           | tier label visible | tier missing    |
| `getByText(/pro/i)`                  | text    | pro-tier card renders            | tier label visible | tier missing    |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected                   |
| ------- | ------ | ------------------ | -------------------------------------------------------- |
| mount   | GET    | /api/billing/tiers | returns array of tier objects with name, planKey, prices |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
