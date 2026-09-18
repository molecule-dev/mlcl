# Page observations: /models/:id/annotations (Annotations)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated; the URL `:id` corresponds to a model the user owns

## Elements

| selector / accessible name          | role     | expected behavior on interaction                     | success signal                      | failure signal       |
| ----------------------------------- | -------- | ---------------------------------------------------- | ----------------------------------- | -------------------- |
| Annotation row by title             | listitem | reflects annotation seeded via POST /api/annotations | annotation title visible in DOM     | row not rendered     |
| Toggle resolved persists            | network  | PUT /api/annotations/:id { resolved: true } persists | subsequent GET shows resolved: true | resolved still false |
| Page renders without console errors | static   | no console.error events besides favicon noise        | error array empty                   | non-favicon errors   |

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
- [x] All elements above have a corresponding test in `e2e/models__id_annotations.spec.ts`
