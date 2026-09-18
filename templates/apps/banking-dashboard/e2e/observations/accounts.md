# Page observations: /accounts (Accounts)

Source: live walk via Playwright + e2e/accounts.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                     | success signal                                             | failure signal               |
| ------------------------------------------------------- | ------- | ---------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /accounts/i, level: 1 })` | heading | h1 renders                                           | visible                                                    | missing                      |
| Eyebrow "Linked institutions"                           | text    | uppercase eyebrow above h1                           | visible                                                    | missing                      |
| Empty-state "No accounts linked yet."                   | text    | renders for a brand-new user with zero accounts      | visible                                                    | wrong copy / shows fake list |
| Total-balance chip (`{{amount}} total`)                 | text    | chip renders once accounts exist; sums balance_cents | chip text matches sum                                      | wrong total                  |
| Active-count chip (`{{count}} active`)                  | text    | renders count of `status=active` accounts            | chip text matches count                                    | wrong count                  |
| Account row link (each `<li>`)                          | link    | clicking navigates to /accounts/:id                  | URL becomes /accounts/{id}, account-detail heading visible | URL unchanged                |
| Account row balance (right side, tabular-nums)          | text    | renders balance_cents formatted as currency          | matches API balance                                        | mismatch                     |
| Account row availability subline                        | text    | renders `{{amount}} available`                       | matches available_cents                                    | wrong number                 |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------- | ------------- | -------------------------------------------- |
| (none — pure list view; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path          | what request body or query is expected |
| ------------ | ------ | ------------- | -------------------------------------- |
| initial load | GET    | /api/accounts | 200 with array of bank accounts        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/accounts.spec.ts`
