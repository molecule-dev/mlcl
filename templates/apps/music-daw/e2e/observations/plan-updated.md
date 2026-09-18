# Page observations: /plan-updated (PlanUpdated)

> Filled from a Playwright MCP walk of the live app. Confirmation
> screen the user lands on after Stripe Checkout success. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                                    | success signal                   | failure signal      |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------- | -------------------------------- | ------------------- |
| spinner (initial)                                                 | n/a     | when `useAuth().state.initialized === false`, show centered spinner | spinner visible during auth init | crash               |
| `getByRole('heading', { name: /plan/i }).first()`                 | heading | confirmation h2 with `planUpdated.message` translation              | visible after init               | missing             |
| second `<h2>` thank-you copy                                      | heading | second h2 with `planUpdated.thankYou` translation                   | visible                          | missing             |
| `getByRole('link', { name: /return home/i })` (wrapping a button) | link    | `<Link to="/">` with a `<Button>`; clicking returns to landing `/`  | URL = `/`                        | broken              |
| anonymous `/plan-updated`                                         | n/a     | AuthGuard redirect                                                  | URL = `/login`                   | renders anonymously |

## Hidden surfaces opened from this page

| trigger | what it opens                      | elements inside (selector / role / behavior) |
| ------- | ---------------------------------- | -------------------------------------------- |
| (none)  | confirmation page is single screen | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected                                               |
| ------------ | ------ | --------------- | ------------------------------------------------------------------------------------ |
| initial load | n/a    | (none directly) | `useAuth()` may have already fetched the user; this page itself does not POST or GET |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
