# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction    | success signal         | failure signal |
| -------------------------------------------------- | ------- | ----------------------------------- | ---------------------- | -------------- |
| `getByRole('link', { name: /sign in/i })`          | link    | navigates to /login                 | URL contains `/login`  | stays on `/`   |
| `getByRole('link', { name: /set up your home/i })` | link    | navigates to /signup                | URL contains `/signup` | stays on `/`   |
| `getByRole('heading').first()`                     | heading | page renders the marketing headline | heading visible        | blank page     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

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
