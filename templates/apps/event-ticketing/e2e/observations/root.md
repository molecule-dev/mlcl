# Page observations: / (Landing)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/root.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> public landing page with hero CTA and live event preview

## Procedure

1. `mcp__playwright__browser_navigate` → `/` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/root.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name                         | role | expected behavior on interaction        | success signal                    | failure signal |
| -------------------------------------------------- | ---- | --------------------------------------- | --------------------------------- | -------------- |
| `link to /signup ("Create account" / hero CTA)`    | link | navigates to /signup                    | URL ends /signup                  | stays on /     |
| `link to /events ("Browse events" / Discover CTA)` | link | navigates to /events                    | URL ends /events                  | stays on /     |
| `link to /login ("Sign in" / footer)`              | link | navigates to /login                     | URL ends /login                   | stays on /     |
| `link to /events/new ("Host an event" / footer)`   | link | navigates to /events/new (auth-guarded) | redirects to /login when unauthed | remains on /   |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                | what request body or query is expected               |
| ------- | ------ | ------------------- | ---------------------------------------------------- |
| load    | GET    | /api/events?limit=4 | fetch latest published events for hero/preview strip |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
