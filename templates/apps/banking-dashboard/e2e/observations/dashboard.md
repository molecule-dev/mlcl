# Page observations: /dashboard (Dashboard)

Source: live walk via Playwright + e2e/dashboard.spec.ts. Dashboard
fetches accounts, transactions, and report stats on first paint and
renders a hero balance card + cash/credit card + accounts triad +
recent activity table.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction                         | success signal                             | failure signal    |
| ------------------------------------------------------------ | ------- | -------------------------------------------------------- | ------------------------------------------ | ----------------- |
| `getByRole('heading', { name: /overview/i, level: 1 })`      | heading | page renders Overview h1                                 | heading visible                            | wrong / missing   |
| Subheading "Money in motion, always clear."                  | text    | tagline renders below h1                                 | visible                                    | missing           |
| Hero `BalanceHeroCard` (Total balance amount + 30d change)   | section | renders net_worth_cents + change with sparkline          | money string visible (e.g. `$0.00`)        | section missing   |
| `CashCreditCard` (Cash on hand / Credit used)                | section | renders cash_on_hand_cents and credit utilization bar    | section visible                            | section missing   |
| Accounts heading "Accounts" + `View all →` link              | link    | clicking the link navigates to /accounts                 | URL becomes /accounts, accounts h1 visible | URL unchanged     |
| `AccountsTriad` rows                                         | list    | renders one row per linked account (or empty-state)      | row count = accounts in DB                 | mismatch with API |
| Recent activity table                                        | section | renders a table with description / date / amount columns | table headers visible                      | table missing     |
| `getByRole('link', { name: /view all/i })` (recent activity) | link    | navigates to /transfers                                  | URL becomes /transfers                     | URL unchanged     |

## Hidden surfaces opened from this page

| trigger                                   | what it opens | elements inside (selector / role / behavior) |
| ----------------------------------------- | ------------- | -------------------------------------------- |
| (none — single-page dashboard, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                         | what request body or query is expected               |
| ------------ | ------ | ---------------------------- | ---------------------------------------------------- |
| initial load | GET    | /api/accounts                | 200 with array of bank accounts                      |
| initial load | GET    | /api/transactions            | 200 with array of bank_transactions rows             |
| initial load | GET    | /api/reports/dashboard_stats | 200 with `{net_worth_cents, …, balance_history_30d}` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
