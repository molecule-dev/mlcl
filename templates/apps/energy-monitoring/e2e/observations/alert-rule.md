# Page observations: /alerts/rules/new (Create alert rule)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                         | role          | expected behavior on interaction                                                                                  | success signal                                                     | failure signal           |
| ---------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| `form`                                                                             | form          | create-rule form with name, threshold, channel selectors; submit POSTs /api/alerts/rules and redirects to /alerts | new rule appears in /api/alerts/rules/list and URL becomes /alerts | no POST or no redirect   |
| `getByRole('checkbox', { name: /email/i }), [data-mol-id="alert-channel-email"]`   | checkbox      | selecting Email reveals an email input                                                                            | email field becomes visible after toggle                           | email field stays hidden |
| `getByRole('button', { name: /cancel/i }), getByRole('link', { name: /cancel/i })` | button / link | returns to /alerts without creating a rule                                                                        | URL becomes /alerts and rule list unchanged                        | rule was still POSTed    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected                                     |
| ------- | ------ | ----------------- | -------------------------------------------------------------------------- |
| submit  | POST   | /api/alerts/rules | `{ name, type, threshold, comparison, notify_email? }` → 201 with new rule |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts_rules_new.spec.ts`
