# Page observations: /pricing (Pricing)

Observed via Playwright MCP at `/pricing` while signed-out (public)
and authenticated (paid-plan checkout).

## Page state assumed

- [x] Public (no auth required) — paid checkout requires auth

## Elements

| selector / accessible name                                             | role   | expected behavior on interaction                                           | success signal                 | failure signal         |
| ---------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- | ------------------------------ | ---------------------- |
| `getByText(/free/i)` (tier heading)                                    | text   | tier list (Free / Pro / Team) renders from GET /api/billing/tiers          | "Free" tier visible within 15s | empty page / 404       |
| `getByRole('button', { name: /upgrade\|subscribe\|choose\|select/i })` | button | (auth) POST /api/billing/checkout for the chosen paid plan                 | 200/201 + Stripe redirect      | request missing or 4xx |
| Tier metadata fetch                                                    | n/a    | GET /api/billing/tiers returns 200 with paid-tier metadata on initial load | request observed, status 200   | 404 / not called       |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger         | method | path                  | what request body or query is expected              |
| --------------- | ------ | --------------------- | --------------------------------------------------- |
| Page load       | GET    | /api/billing/tiers    | 200 with `[ { name:'free' }, { name:'pro' }, ... ]` |
| Click paid plan | POST   | /api/billing/checkout | `{ tier }` → 200/201 with checkout_url              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
