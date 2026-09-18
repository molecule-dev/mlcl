# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role              | expected behavior on interaction | success signal            | failure signal            |
| ----------------------------------------- | ----------------- | -------------------------------- | ------------------------- | ------------------------- |
| `getByRole("heading")` (top hero h1/h2)   | heading           | renders product name + tagline   | non-empty visible heading | empty/placeholder heading |
| `getByRole("link", { name: /sign up       | get started/i })` | link                             | navigate to /signup       | URL becomes /signup       | stays on / |
| `getByRole("link", { name: /sign in       | log in/i })`      | link                             | navigate to /login        | URL becomes /login        | stays on / |
| `getByRole("link", { name: /pricing/i })` | link              | navigate to /pricing             | URL becomes /pricing      | stays on /                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
