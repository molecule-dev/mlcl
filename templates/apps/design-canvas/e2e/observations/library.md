# Page observations: /library (Library)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/library`
2. browser_snapshot — left rail of four section buttons + active section content (colors grid, typography list, components grid, or effects grid)
3. After clicking each rail button, the right column re-renders with that section's tokens

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction                 | success signal                                 | failure signal    |
| -------------------------------------------- | ------- | ------------------------------------------------ | ---------------------------------------------- | ----------------- |
| `getByRole('heading', { name: /Library/ })`  | heading | renders the page title                           | level-1 heading visible                        | heading missing   |
| `[data-mol-id="library-section-colors"]`     | button  | activates the Color tokens section               | rail item highlighted, color cards render      | section unchanged |
| `[data-mol-id="library-section-typography"]` | button  | activates the Typography section                 | rail item highlighted, typography list renders | section unchanged |
| `[data-mol-id="library-section-components"]` | button  | activates the Components section                 | rail item highlighted, components grid renders | section unchanged |
| `[data-mol-id="library-section-effects"]`    | button  | activates the Effects section                    | rail item highlighted, effects grid renders    | section unchanged |
| `[data-mol-id="library-section-content"]`    | region  | shows the active section's tokens                | renders cards or empty-state copy              | region empty      |
| `[data-mol-id^="library-token-"]`            | article | each token card renders the token's name + value | token name visible                             | none rendered     |

## Hidden surfaces opened from this page

| trigger       | what it opens           | elements inside (selector / role / behavior) |
| ------------- | ----------------------- | -------------------------------------------- |
| empty section | inline placeholder copy | "No tokens in this section yet."             |
| initial load  | inline loading copy     | "Loading design tokens…"                     |

## Network calls expected during normal use

| trigger        | method | path                 | what request body or query is expected          |
| -------------- | ------ | -------------------- | ----------------------------------------------- |
| initial render | GET    | `/api/design_tokens` | bearer-authed; returns the seeded design tokens |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/library.spec.ts`
