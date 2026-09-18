# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated guest

## Elements

| selector / accessible name                | role         | expected behavior on interaction    | success signal       | failure signal      |
| ----------------------------------------- | ------------ | ----------------------------------- | -------------------- | ------------------- |
| `getByRole('link', { name: /sign up       | get started  | create/i })`                        | link                 | Routes to /signup   | URL becomes /signup | stays on / |
| `getByRole('link', { name: /sign in       | log in/i })` | link                                | Routes to /login     | URL becomes /login  | stays on /          |
| `getByRole('link', { name: /pricing/i })` | link         | Routes to /pricing                  | URL becomes /pricing | stays on /          |
| Glint logo / brand wordmark               | text         | Renders as the marketing identifier | "Glint" visible      | wrong/missing brand |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected |
| --------- | ------ | ---------- | -------------------------------------- |
| page load | GET    | / (static) | no API call required                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-landing.spec.ts`
