# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction | success signal          | failure signal                    |
| --------------------------------------------------------- | ------- | -------------------------------- | ----------------------- | --------------------------------- |
| `getByRole('link', { name: /get a demo/i }).first()`      | link    | navigate to /signup              | URL ends with /signup   | stays on /                        |
| `getByRole('link', { name: /sign in/i }).first()`         | link    | navigate to /login               | URL ends with /login    | stays on /                        |
| `getByRole('heading', { level: 1 })` (Command every mile) | heading | static visible hero heading      | heading visible on page | heading not present / blank shell |
| `getByRole('link', { name: /bearing/i }).first()`         | link    | site logo home link, points to / | href="/"                | broken/missing link               |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside (selector / role / behavior) |
| ------------------------------ | ------------- | -------------------------------------------- |
| (none — static marketing page) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger           | method | path | what request body or query is expected |
| ----------------- | ------ | ---- | -------------------------------------- |
| Initial page load | GET    | /    | static SPA shell, no API call          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
