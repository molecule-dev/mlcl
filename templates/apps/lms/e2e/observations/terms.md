# Page observations: /terms (Terms of service)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous OK (public static page)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction | success signal  | failure signal |
| ------------------------------------------------------------- | ------- | -------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /^Terms$/i, level: 1 })`        | heading | renders page title               | heading visible | absent         |
| `getByRole('heading', { name: /account responsibilities/i })` | heading | account-rules section heading    | visible         | missing        |
| `getByRole('heading', { name: /service availability/i })`     | heading | uptime section heading           | visible         | missing        |

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
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
