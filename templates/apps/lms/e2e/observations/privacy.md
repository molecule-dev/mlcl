# Page observations: /privacy (Privacy policy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous OK (public static page)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction | success signal    | failure signal |
| -------------------------------------------------------- | ------- | -------------------------------- | ----------------- | -------------- |
| `getByRole('heading', { name: /^Privacy$/i, level: 1 })` | heading | renders page title               | heading visible   | absent         |
| `getByText(/scholar lms collects/i)`                     | text    | shows the introductory paragraph | paragraph visible | missing        |
| `getByRole('heading', { name: /what we collect/i })`     | heading | section heading rendered         | visible           | missing        |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
