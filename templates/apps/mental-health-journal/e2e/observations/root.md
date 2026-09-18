# Page observations: / (Landing)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs` (Playwright). Rows reflect what the rendered
> page actually showed on `browser_snapshot` after `browser_navigate`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction | success signal      | failure signal                   |
| ------------------------------------------------------------------- | ------- | -------------------------------- | ------------------- | -------------------------------- |
| `getByRole('link', { name: /^Lucid$/ })`                            | link    | navigates to / (logo)            | URL stays /         | 4xx/5xx response or unchanged UI |
| `getByRole('link', { name: /Sign in/i }).first()`                   | link    | navigates to /login              | URL becomes /login  | 4xx/5xx response or unchanged UI |
| `getByRole('link', { name: /Start journaling/i })`                  | link    | navigates to /signup             | URL becomes /signup | 4xx/5xx response or unchanged UI |
| `getByRole('link', { name: /Begin your first entry/i }).first()`    | link    | navigates to /signup             | URL becomes /signup | 4xx/5xx response or unchanged UI |
| `getByRole('link', { name: /See it in action/i })`                  | link    | navigates to /login              | URL becomes /login  | 4xx/5xx response or unchanged UI |
| `getByRole('heading', { level: 1, name: /See yourself clearly/i })` | heading | renders hero h1                  | heading visible     | not rendered                     |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                          | method | path | what request body or query is expected |
| -------------------------------- | ------ | ---- | -------------------------------------- |
| (none — landing is fully static) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
