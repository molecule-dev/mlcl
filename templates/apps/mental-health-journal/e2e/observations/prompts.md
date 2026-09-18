# Page observations: /prompts (Prompts)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role                          | expected behavior on interaction | success signal                         | failure signal                   |
| ------------------------------------------------------------- | ----------------------------- | -------------------------------- | -------------------------------------- | -------------------------------- |
| `getByRole('heading', { level: 1, name: /Prompt library/i })` | heading                       | renders page title               | visible                                | not rendered                     |
| `getByRole('button', { name: /^All$/ })`                      | button                        | shows all prompts                | aria-pressed=true                      | filter ignored                   |
| `getByRole('button', { name: /^Favorites$/ })`                | button                        | filters to favorited prompts     | aria-pressed=true, filtered list       | unchanged                        |
| `getByRole('button', { name: /^Gratitude$/ })`                | button                        | filters by category gratitude    | aria-pressed=true                      | unchanged                        |
| `getByRole('button', { name: /save favorite                   | remove favorite/i }).first()` | button                           | POST /api/journal/prompts/:id/favorite | aria-pressed flips, icon changes | toast error |
| `getByRole('link', { name: /Write about this/i }).first()`    | link                          | navigates to /journal/new        | URL /journal/new                       | 4xx/5xx                          |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path                              | what request body or query is expected |
| ------------------- | ------ | --------------------------------- | -------------------------------------- |
| Page load           | GET    | /api/journal/prompts              | (no body)                              |
| Click favorite icon | POST   | /api/journal/prompts/:id/favorite | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/prompts.spec.ts`
