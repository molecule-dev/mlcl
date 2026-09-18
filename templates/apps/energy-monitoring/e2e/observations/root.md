# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role        | expected behavior on interaction | success signal          | failure signal       |
| ------------------------------------------------- | ----------- | -------------------------------- | ----------------------- | -------------------- |
| `getByRole('link', { name: /Sign in/i })`         | link        | navigates to /login              | URL becomes /login      | URL unchanged        |
| `getByRole('link', { name: /Plug in Voltrace      | Get started | Sign up/i }).first()`            | link                    | navigates to /signup | URL becomes /signup | URL unchanged |
| `getByRole('link', { name: /Pricing/i }).first()` | link        | navigates to /pricing            | URL becomes /pricing    | URL unchanged        |
| `page.locator('h1, h2').first()`                  | heading     | renders Voltrace product hero    | visible heading present | page is blank        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger                        | method | path | what request body or query is expected |
| ------------------------------ | ------ | ---- | -------------------------------------- |
| (none — public marketing page) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
