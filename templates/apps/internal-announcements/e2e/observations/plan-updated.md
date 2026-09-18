# Page observations: /plan-updated (PlanUpdated)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (Stripe Checkout's success_url lands here for signed-in user)

## Elements

| selector / accessible name                                     | role                            | expected behavior on interaction | success signal        | failure signal |
| -------------------------------------------------------------- | ------------------------------- | -------------------------------- | --------------------- | -------------- |
| `getByRole("button", { name: /Toggle theme/i })`               | button                          | flips theme                      | `data-mol-mode` flips | unchanged      |
| `getByRole("button", { name: /Open user menu/i })`             | button                          | opens user dropdown              | menu visible          | nothing        |
| `getByRole("button", { name: /Return home/i })` (top variant)  | button                          | navigates to `/`                 | URL `/`               | stays          |
| `getByRole("link", { name: /Return home/i })` (anchor variant) | link `/`                        | navigates to `/`                 | URL `/`               | stays          |
| `getByRole("link", { name: /Clarion/i })`                      | link `/`                        | header brand back to landing     | URL `/`               | stays          |
| `getByRole("link", { name: /About Clarion/i })`                | link `https://www.molecule.dev` | external                         | new tab               | nothing        |
| `getByRole("button", { name: /Privacy Policy/i })`             | button                          | privacy modal/page               | content visible       | nothing        |
| `getByRole("button", { name: /Terms of Service/i })`           | button                          | terms modal/page                 | content visible       | nothing        |
| `getByRole("button", { name: /Language/i })`                   | button                          | locale picker                    | menu opens            | nothing        |

## Hidden surfaces opened from this page

| trigger   | what it opens | elements inside (selector / role / behavior) |
| --------- | ------------- | -------------------------------------------- |
| User menu | dropdown      | settings, sign out                           |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected         |
| --------- | ------ | --------------- | ---------------------------------------------- |
| Page load | GET    | `/api/users/me` | refresh user record (planKey may have flipped) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
