# Page observations: /terms (Terms)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role              | expected behavior on interaction | success signal  | failure signal |
| ---------------------------------------------------- | ----------------- | -------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /Terms/i, level: 1 })` | heading           | renders page title               | heading visible | absent         |
| intro paragraph                                      | paragraph         | terms summary                    | element visible | absent         |
| `getByRole('heading', { name: /Acceptable use/i })`  | heading (level 2) | acceptable-use section           | element visible | absent         |
| `getByRole('heading', { name: /Service level/i })`   | heading (level 2) | SLA section                      | element visible | absent         |
| `getByRole('heading', { name: /Termination/i })`     | heading (level 2) | termination section              | element visible | absent         |
| contact paragraph                                    | paragraph         | shows legal contact email        | element visible | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

_None — purely a static document page; no /api requests expected._

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
