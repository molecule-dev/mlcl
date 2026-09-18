# Page observations: / (Landing)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/root.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> public landing — pitches Chrono ("Every second, accounted for") and
> drives signup; sticky nav exposes the same two CTAs.

## Procedure

1. `mcp__playwright__browser_navigate` → `/` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/root.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Public (no auth required) — `page.goto` directly.

## Elements

| selector / accessible name                            | role    | expected behavior on interaction | success signal                          | failure signal |
| ----------------------------------------------------- | ------- | -------------------------------- | --------------------------------------- | -------------- |
| `link "schedule Chrono"` (logo)                       | link    | navigate to `/`                  | URL is `/`                              | broken link    |
| nav `link "Sign in"` (`/login`)                       | link    | navigate to /login               | URL ends `/login`, login form visible   | no nav         |
| nav `link "Start tracking — free"` (`/signup`)        | link    | navigate to /signup              | URL ends `/signup`, signup form visible | no nav         |
| hero `heading "Every second, accounted for"` (h1)     | heading | renders headline                 | h1 visible with that text               | no h1          |
| hero `link "Start tracking — free"` (`/signup`)       | link    | navigate to /signup              | URL ends `/signup`                      | no nav         |
| feature card `heading "One-click timer"` (h3)         | heading | renders feature blurb            | h3 visible                              | missing        |
| feature card `heading "Projects with budgets"` (h3)   | heading | renders feature blurb            | h3 visible                              | missing        |
| feature card `heading "Reports clients love"` (h3)    | heading | renders feature blurb            | h3 visible                              | missing        |
| feature card `heading "Invoices, automatically"` (h3) | heading | renders feature blurb            | h3 visible                              | missing        |
| footer `link "Start tracking — free"` (`/signup`)     | link    | navigate to /signup              | URL ends `/signup`                      | no nav         |

## Hidden surfaces opened from this page

(none — landing has no menus, modals, or expandable sections)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(none — landing is pure marketing, no API calls)

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
