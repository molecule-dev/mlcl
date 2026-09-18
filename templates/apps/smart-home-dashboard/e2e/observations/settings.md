# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction     | success signal                | failure signal |
| ---------------------------------------------- | ------- | ------------------------------------ | ----------------------------- | -------------- |
| `getByTestId('settings-plan-name').first()`    | text    | shows the user's current plan name   | plan name visible (Free)      | blank          |
| `getByTestId('settings-upgrade-link').first()` | link    | navigates to /pricing                | URL contains `/pricing`       | no nav         |
| GET /api/billing/status                        | network | page fetches billing status on mount | GET observed, returns planKey | no GET or 500  |
| public /api/billing/tiers endpoint             | network | returns the published tier ladder    | array with free + pro keys    | 4xx/5xx        |
| POST /api/billing/checkout (priceId=pro)       | network | returns a real Stripe Checkout URL   | cs_test_... URL               | empty / 500    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| page mount        | GET    | /api/billing/status   | (no body)                              |
| /pricing mount    | GET    | /api/billing/tiers    | (no body)                              |
| click pro upgrade | POST   | /api/billing/checkout | `{ priceId }`                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
