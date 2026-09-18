# Page observations: / (Landing)

Observed via Playwright MCP at `http://localhost:VITE_PORT/` while
signed out — Cairn marketing landing page (public).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction | success signal      | failure signal |
| ---------------------------------------------------------------- | ------- | -------------------------------- | ------------------- | -------------- |
| `getByRole('link', { name: 'Sign in' })` (top right)             | link    | routes to /login                 | URL becomes /login  | stays on /     |
| `getByRole('link', { name: 'Start a workspace' })` (primary CTA) | link    | routes to /signup                | URL becomes /signup | stays on /     |
| `getByRole('heading', { level: 1, name: /stack knowledge/i })`   | heading | hero headline rendered           | text visible        | missing/empty  |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(none — landing renders without backend fetches)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/landing.spec.ts`
