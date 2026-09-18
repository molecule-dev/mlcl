# Page observations: /pricing (Pricing)

Source: live walk via Playwright + e2e/pricing.spec.ts. Public
pricing surface backed by the @molecule/app-billing-react
PricingPage component. Reads /api/billing/tiers (no auth required)
and renders per-tier limits via the per-app `renderLimits` callback.

## Page state assumed

- [x] Public (unauthenticated)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction             | success signal          | failure signal |
| -------------------------------------------------------------- | ------- | -------------------------------------------- | ----------------------- | -------------- |
| Page heading                                                   | heading | renders without authentication               | visible                 | missing        |
| First-paint network: GET /api/billing/tiers (no auth required) | network | 200 with `{data:[{key,name,prices,limits}]}` | captured 200            | missing fetch  |
| Three tier name labels (Free / Pro / Team) + per-clip limits   | text    | one per card; per-clip limits text rendered  | all four labels visible | any missing    |

## Hidden surfaces opened from this page

| trigger                             | what it opens | elements inside (selector / role / behavior) |
| ----------------------------------- | ------------- | -------------------------------------------- |
| (none — single-pass marketing page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected       |
| ------------ | ------ | ------------------ | -------------------------------------------- |
| initial load | GET    | /api/billing/tiers | 200 with `{data:[{key,name,prices,limits}]}` |

## Coverage check (final pass)

- [x] Heading rendered
- [x] All 3 tier names present
- [x] /api/billing/tiers fetched (no auth needed)
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
