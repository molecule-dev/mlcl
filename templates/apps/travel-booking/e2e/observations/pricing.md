# Page observations: /pricing (Pricing)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                    | success signal                   | failure signal               |
| ------------------------------------------------------ | ------- | --------------------------------------------------- | -------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /Choose your.*plan/i })` | heading | pricing page renders + GET /api/billing/tiers fires | heading visible + GET in network | heading missing or GET fails |
| `getByText(/Free/i).first()`                           | text    | Free tier name visible                              | text visible                     | text missing                 |
| `getByText(/Pro/i).first()`                            | text    | Pro tier name visible                               | text visible                     | text missing                 |
| `getByText(/Team/i).first()`                           | text    | Team tier name visible                              | text visible                     | text missing                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                 | what request body or query is expected            |
| ------------ | ------ | -------------------- | ------------------------------------------------- |
| initial load | GET    | `/api/billing/tiers` | 200 with array of pricing tiers (Free, Pro, Team) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
