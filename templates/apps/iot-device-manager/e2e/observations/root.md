# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/` (use APP_BASE)
   - Public route, no auth.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role | expected behavior on interaction  | success signal         | failure signal        |
| ---------------------------------------------------- | ---- | --------------------------------- | ---------------------- | --------------------- |
| `getByRole('link', { name: 'Filament' })`            | link | navigates to `/` (logo home link) | URL is `/`             | URL changed elsewhere |
| `getByRole('link', { name: 'Sign in' }).first()`     | link | navigates to `/login`             | URL contains `/login`  | URL unchanged         |
| `getByRole('link', { name: /get a demo/i }).first()` | link | navigates to `/signup`            | URL contains `/signup` | URL unchanged         |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| page load | (none) | (static landing page) | (no API calls expected)                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
