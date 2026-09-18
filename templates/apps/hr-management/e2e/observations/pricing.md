# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/pricing.spec.ts`.

## Procedure

1. `browser_navigate` → `/pricing` (no auth required).
2. `browser_snapshot` → walk every tier card.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name   | role    | expected behavior on interaction                     | success signal                    | failure signal         |
| ---------------------------- | ------- | ---------------------------------------------------- | --------------------------------- | ---------------------- |
| Free / Pro / Team tier cards | view    | renders all three live tiers from /api/billing/tiers | "Free", "Pro", "Team" all visible | any missing            |
| Initial mount network call   | request | GET /api/billing/tiers                               | 200 status                        | not fired / non-200    |
| Tiers payload contract       | data    | paid tiers expose `stripePriceId` so checkout works  | priceId present on Pro + Team     | priceId null on either |

## Hidden surfaces opened from this page

(none; all tier limits are inline)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| initial mount | GET    | /api/billing/tiers | (no body, public endpoint)             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
