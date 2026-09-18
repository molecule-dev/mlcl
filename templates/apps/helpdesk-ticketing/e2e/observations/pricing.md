# Page observations: /pricing (Pricing)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                                                    | success signal                      | failure signal         |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------- | ----------------------------------- | ---------------------- |
| `text=/Free/`                  | region  | Free tier card visible (server-driven from /api/billing/tiers)                      | visible with "Free" label + bullets | absent / spinner stuck |
| `text=/Pro/`                   | region  | Pro tier card visible with "$19/mo" pricing                                         | visible with monthly price          | absent                 |
| `text=/Team/`                  | region  | Team tier card visible with "$49/mo" pricing                                        | visible with monthly price          | absent                 |
| `getByRole("heading").first()` | heading | pricing page heading paints (does NOT throw the global "An unexpected error" alert) | heading visible; no role=alert      | role=alert visible     |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected |
| ------- | ------ | ------------------ | -------------------------------------- |
| mount   | GET    | /api/billing/tiers | (none — public)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
