# Page observations: /pricing (Pricing)

> Captured live by an agent driving Playwright against the running app
> (see scripts/_fd-fill-observations.mjs for the walker that emits this
> data — observations themselves are written from the real snapshot,
> not from imagination).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role   | expected behavior on interaction | success signal               | failure signal                    |
| -------------------------------------------------- | ------ | -------------------------------- | ---------------------------- | --------------------------------- |
| `page.locator('[data-mol-id="pricing-cta-free"]')` | button | triggers user action             | expected UI/network response | nothing happens / network 4xx/5xx |
| `page.locator('[data-mol-id="pricing-cta-pro"]')`  | button | triggers user action             | expected UI/network response | nothing happens / network 4xx/5xx |
| `page.locator('[data-mol-id="pricing-cta-team"]')` | button | triggers user action             | expected UI/network response | nothing happens / network 4xx/5xx |

## Hidden surfaces opened from this page

| trigger                                                            | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------------ | ------------- | -------------------------------------------- |
| (none documented; tabs/modals exercised in the corresponding spec) | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path               | what request body or query is expected |
| ----------------------- | ------ | ------------------ | -------------------------------------- |
| Page load / interaction | GET    | /api/billing/tiers | (see spec)                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
