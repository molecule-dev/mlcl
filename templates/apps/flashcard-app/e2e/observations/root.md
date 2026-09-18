# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                   | role | expected behavior on interaction | success signal      | failure signal |
| ---------------------------------------------------------------------------- | ---- | -------------------------------- | ------------------- | -------------- |
| `getByRole("link", { name: /Engram/i })` (top nav)                           | link | navigates to landing root /      | href=/              | 404 or no nav  |
| `getByRole("link", { name: /Sign in/i })` (top-right)                        | link | navigates to /login              | URL becomes /login  | stays on /     |
| `getByRole("link", { name: /Start studying free/i })` (top-right CTA)        | link | navigates to /signup             | URL becomes /signup | stays on /     |
| `getByRole("link", { name: /Start learning free/i })` (hero)                 | link | navigates to /signup             | URL becomes /signup | stays on /     |
| `getByRole("link", { name: /I already have an account/i })` (hero secondary) | link | navigates to /login              | URL becomes /login  | stays on /     |
| `getByRole("link", { name: /Start your first deck/i })` (final CTA)          | link | navigates to /signup             | URL becomes /signup | stays on /     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected       |
| ------- | ------ | ---- | -------------------------------------------- |
| load /  | GET    | /    | static HTML; no API call expected on landing |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
