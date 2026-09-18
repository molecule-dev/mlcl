# Page observations: /privacy (Privacy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role              | expected behavior on interaction | success signal  | failure signal |
| ------------------------------------------------------ | ----------------- | -------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /Privacy/i, level: 1 })` | heading           | renders page title               | heading visible | absent         |
| intro paragraph                                        | paragraph         | summarises privacy policy        | element visible | absent         |
| `getByRole('heading', { name: /What we store/i })`     | heading (level 2) | data inventory section           | element visible | absent         |
| `getByRole('heading', { name: /Sub-processors/i })`    | heading (level 2) | sub-processors section           | element visible | absent         |
| `getByRole('heading', { name: /Your rights/i })`       | heading (level 2) | rights section                   | element visible | absent         |
| contact paragraph                                      | paragraph         | shows privacy contact email      | element visible | absent         |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
