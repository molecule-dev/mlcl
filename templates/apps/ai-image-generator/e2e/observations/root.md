# Page observations: / (root)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role            | expected behavior on interaction                           | success signal                 | failure signal           |
| ----------------------------------------------------------- | --------------- | ---------------------------------------------------------- | ------------------------------ | ------------------------ |
| `getByRole("link", { name: /Sign in/i })` (header)          | link            | navigate to /login                                         | URL becomes /login             | stays on /               |
| `getByRole("link", { name: /Start creating/i })` (header)   | link            | navigate to /signup                                        | URL becomes /signup            | stays on /               |
| `getByRole("link", { name: /^Features$/i })`                | link (anchor)   | jump to #features section                                  | URL hash becomes #features     | no scroll                |
| `getByRole("link", { name: /^Gallery$/i })` (marketing nav) | link (anchor)   | jump to #gallery section                                   | URL hash becomes #gallery      | no scroll                |
| `getByRole("link", { name: /^Pricing$/i })` (marketing nav) | link (anchor)   | jump to #pricing section                                   | URL hash becomes #pricing      | no scroll                |
| `getByPlaceholder(/dreamscape/i)`                           | textbox         | accept text input for prompt                               | value reflects typed text      | value empty after typing |
| `getByRole("button", { name: /Photoreal/i })` (style chips) | button (toggle) | select photoreal style                                     | aria-pressed=true              | no toggle                |
| `getByRole("button", { name: /Anime/i })` (style chips)     | button (toggle) | select anime style                                         | aria-pressed=true              | no toggle                |
| `getByRole("button", { name: /Generate/i })` (hero)         | button          | redirect unauthenticated user to /signup with prompt query | URL becomes /signup?prompt=... | stays on /               |
| `getByRole("link", { name: /Start free/i })`                | link            | navigate to /signup (Starter plan CTA)                     | URL becomes /signup            | stays on /               |
| `getByRole("link", { name: /Try Creator/i })`               | link            | navigate to /signup (Creator plan CTA)                     | URL becomes /signup            | stays on /               |
| `getByRole("link", { name: /Talk to sales/i })`             | link            | navigate to /signup (Studio plan CTA)                      | URL becomes /signup            | stays on /               |
| `getByRole("link", { name: /Create your first dream/i })`   | link            | navigate to /signup (final CTA)                            | URL becomes /signup            | stays on /               |

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
