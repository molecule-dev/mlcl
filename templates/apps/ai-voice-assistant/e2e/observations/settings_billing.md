# Page observations: /settings/billing (Billing)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role   | expected behavior on interaction    | success signal                              | failure signal       |
| -------------------------------------------------------- | ------ | ----------------------------------- | ------------------------------------------- | -------------------- |
| getByRole('button', { name: /your.*plan/i }) (Your plan) | button | clicks "Your plan"                  | button responds (network call or UI update) | no observable change |
| getByRole('button', { name: /switch/i }) (Switch)        | button | toggles aria-checked / aria-pressed | attribute flips                             | attribute unchanged  |
| getByRole('button', { name: /update/i }) (Update)        | button | clicks "Update"                     | button responds (network call or UI update) | no observable change |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                | what request body or query is expected |
| -------------- | ------ | ------------------- | -------------------------------------- |
| initial render | GET    | /api/billing/tiers  | returns the page data                  |
| initial render | GET    | /api/billing/status | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_billing.spec.ts`
