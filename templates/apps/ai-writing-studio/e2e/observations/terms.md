# Page observations: /terms (Terms)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction | success signal | failure signal  |
| --------------------------------------------------------------- | ------- | -------------------------------- | -------------- | --------------- |
| `getByRole('heading', { name: /Terms of Service/i, level: 1 })` | heading | page title renders               | h1 visible     | h1 missing      |
| `getByRole('heading', { name: /Your content/i, level: 2 })`     | heading | content-license section renders  | h2 visible     | section missing |
| `getByRole('heading', { name: /^Billing$/i, level: 2 })`        | heading | billing section renders          | h2 visible     | section missing |
| `getByText(/By creating an account/i).first()`                  | text    | intro paragraph renders          | text visible   | text missing    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                               | method | path | what request body or query is expected |
| ------------------------------------- | ------ | ---- | -------------------------------------- |
| (no app-API calls; static legal page) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
