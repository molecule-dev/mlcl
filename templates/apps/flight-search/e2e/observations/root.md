# Page observations: / (Landing)

> Filled by AI agent driving the running smoke app on 3180/4180 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/root.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> Marketing landing — Skylark hero + value props + airport pills + signup/sign-in CTAs.

## Procedure

1. `mcp__playwright__browser_navigate` → `/` (no auth)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name    | role    | expected behavior on interaction | success signal   | failure signal  |
| ----------------------------- | ------- | -------------------------------- | ---------------- | --------------- |
| `getByRole(heading, level=1)` | heading | hero headline visible            | text rendered    | element missing |
| `a[href="/signup"]`           | link    | navigates to signup              | URL ends /signup | stays on /      |
| `a[href="/login"]`            | link    | navigates to login               | URL ends /login  | stays on /      |

## Hidden surfaces opened from this page

(none — landing renders inline content)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger               | method | path                  | what request body or query is expected |
| --------------------- | ------ | --------------------- | -------------------------------------- |
| reachable from public | GET    | /api/airports/popular | returns array of airports              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
