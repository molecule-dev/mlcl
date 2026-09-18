# Page observations: /help (Help / support)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous OK (public static page)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction             | success signal  | failure signal |
| ----------------------------------------------------- | ------- | -------------------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /^Help$/i, level: 1 })` | heading | renders page title                           | heading visible | absent         |
| `getByRole('heading', { name: /for students/i })`     | heading | "For students" section heading               | visible         | missing        |
| `getByText(/check assignment due dates/i)`            | text    | shows the first guidance bullet for students | visible         | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

This page is static content — it makes no backend requests.

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
