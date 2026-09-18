# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                         | role                            | expected behavior on interaction                         | success signal                          | failure signal |
| ------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------- | --------------------------------------- | -------------- |
| `getByRole("button", { name: /Toggle theme/i })`                   | button                          | flips light↔dark mode                                    | `documentElement.dataset.molMode` flips | mode unchanged |
| `getByRole("link", { name: /^Clarion/i })` (header brand)          | link `/`                        | stays on landing                                         | URL `/`                                 | navigates away |
| `getByRole("link", { name: "Pricing" })` (top nav)                 | link `/pricing`                 | navigates to pricing                                     | URL `/pricing`                          | stays on `/`   |
| `getByRole("link", { name: "Sign in" })`                           | link `/login`                   | navigates to login                                       | URL `/login`                            | stays on `/`   |
| `getByRole("link", { name: /Start free/i })`                       | link `/signup`                  | navigates to signup                                      | URL `/signup`                           | stays on `/`   |
| `getByRole("link", { name: /Start your workspace/i })` (hero CTA)  | link `/signup`                  | navigates to signup                                      | URL `/signup`                           | stays on `/`   |
| `getByRole("link", { name: /Compare plans/i })`                    | link `/pricing`                 | navigates to pricing                                     | URL `/pricing`                          | stays on `/`   |
| `getByRole("link", { name: /^tag\s+company/ })` (channel chip)     | link `/feed?channel=company`    | sends viewer to feed (login redirect)                    | URL contains `/feed` or `/login`        | 404            |
| `getByRole("link", { name: /Q3 town hall recap/i })` (sample card) | link `/announcement/a-1`        | opens demo announcement (redirects to login when public) | URL `/login` (redirected) or detail     | crash          |
| `getByRole("link", { name: /Open & acknowledge/i })`               | link `/announcement/a-1`        | as above                                                 | URL `/login` (redirected)               | crash          |
| `getByRole("link", { name: /About Clarion/i })`                    | link `https://www.molecule.dev` | opens external                                           | new tab/url                             | nothing        |
| `getByRole("button", { name: /Privacy Policy/i })`                 | button                          | opens privacy policy modal/page                          | privacy content visible                 | no change      |
| `getByRole("button", { name: /Terms of Service/i })`               | button                          | opens terms modal/page                                   | terms content visible                   | no change      |
| `getByRole("button", { name: /Language/i })`                       | button                          | opens language picker                                    | menu opens                              | nothing        |

## Hidden surfaces opened from this page

| trigger         | what it opens   | elements inside (selector / role / behavior) |
| --------------- | --------------- | -------------------------------------------- |
| Language button | locale dropdown | role=menu of locale options                  |

## Network calls expected during normal use

| trigger   | method | path                                                    | what request body or query is expected |
| --------- | ------ | ------------------------------------------------------- | -------------------------------------- |
| page load | GET    | `/api/categories` (best-effort, may be 401 when unauth) | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
