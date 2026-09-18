# Page observations: /billing (Billing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction          | success signal            | failure signal      |
| -------------------------------------------------------------- | ------- | ----------------------------------------- | ------------------------- | ------------------- |
| `getByRole('heading', { name: /^Billing$/i, level: 1 })`       | heading | page title renders                        | h1 visible                | h1 missing          |
| `getByText(/Current plan/i)`                                   | text    | "Current plan" label visible in plan card | label visible             | label missing       |
| `getByText(/AI generations included/i)`                        | text    | included-AI-generations row               | row visible with count    | row missing         |
| `getByRole('button', { name: /(View plans\|Change plan)/i })`  | button  | navigates to `/pricing`                   | URL becomes `/pricing`    | URL unchanged       |
| `getByRole('heading', { name: /Invoice history/i, level: 2 })` | heading | invoice-history section heading           | h2 visible                | section missing     |
| `getByText(/No invoices yet/i)` (fresh user)                   | text    | invoice-history empty-state               | copy visible for new user | empty-state missing |
| `getByRole('link', { name: /Open account settings/i })`        | link    | navigates to `/settings`                  | URL becomes `/settings`   | URL unchanged       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                 | what request body or query is expected                              |
| -------------- | ------ | -------------------- | ------------------------------------------------------------------- |
| initial render | GET    | /api/billing/summary | returns `{ plan: { planKey, name, isFree, limits }, invoices: [] }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
