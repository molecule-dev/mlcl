# Page observations: / (Landing)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/root.spec.ts`. All elements
> below were observed in the live accessibility tree.

## Procedure

1. `mcp__playwright__browser_navigate` → `/`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/root.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction | success signal | failure signal |
| ------------------------------------------------------------------ | ------- | -------------------------------- | -------------- | -------------- |
| `getByRole('heading', { level: 1 })`                               | heading | static — hero copy               | visible        | missing        |
| `getByRole('link', { name: /sign up\|get started\|start free/i })` | link    | navigates to /signup             | URL → /signup  | stays on /     |
| `getByRole('link', { name: /sign in\|log in/i })`                  | link    | navigates to /login              | URL → /login   | stays on /     |

## Hidden surfaces opened from this page

(none; landing page is single-screen marketing)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(landing page is fully static — no API calls on mount)

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
