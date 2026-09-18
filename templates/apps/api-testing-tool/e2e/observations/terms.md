# Page observations: /terms (Terms)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role        | expected behavior on interaction                  | success signal        | failure signal |
| ---------------------------------------------------- | ----------- | ------------------------------------------------- | --------------------- | -------------- |
| `getByRole('heading', { name: /Terms/i, level: 1 })` | heading     | renders the static "Terms of service" heading     | heading visible       | missing        |
| `[data-mol-id=page-terms]`                           | main region | renders the terms main element (i18n-driven copy) | element exists in DOM | missing        |
| `getByRole('heading', { name: /Your account/i })`    | heading     | section about account responsibilities            | heading visible       | missing        |
| `getByRole('heading', { name: /Billing/i })`         | heading     | section about subscription billing                | heading visible       | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected  |
| --------- | ------ | --------------- | --------------------------------------- |
| Page load | GET    | / (vite static) | no API calls — the page is fully static |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
