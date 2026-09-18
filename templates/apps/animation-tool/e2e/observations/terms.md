# Page observations: /terms (Terms)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role     | expected behavior on interaction | success signal                 | failure signal |
| ---------------------------------------------------- | -------- | -------------------------------- | ------------------------------ | -------------- |
| `getByRole('heading', { name: /Terms/i, level: 1 })` | heading  | render terms heading             | visible                        | absent         |
| Terms of service body content                        | text     | static markdown content rendered | textContent length > 200 chars | empty body     |
| `page.locator('main')`                               | landmark | wraps page content               | visible                        | absent         |

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
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
