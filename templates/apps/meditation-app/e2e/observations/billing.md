# Page observations: /billing (Billing)

Subscription / billing page. Asserts tier list render and period switch UX.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role                         | expected behavior on interaction                                                   | success signal                                              | failure signal                 |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| tier cards render (Free, Plus, Premium…) | list                         | fetches /api/billing/tiers and renders one card per tier with price                | at least one tier card visible                              | no tiers shown                 |
| `getByRole("button", { name: /monthly    | yearly/i })` (period switch) | button                                                                             | toggles displayed prices between monthly and yearly cadence | price strings update on toggle | prices unchanged |
| current-plan / status section            | section                      | fetches /api/billing/status and shows the active plan label for the signed-in user | plan label visible (e.g. Free)                              | section missing                |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected |
| ------------ | ------ | ------------------- | -------------------------------------- |
| initial load | GET    | /api/billing/tiers  | 200 with tier definitions              |
| initial load | GET    | /api/billing/status | 200 with current plan + status         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
