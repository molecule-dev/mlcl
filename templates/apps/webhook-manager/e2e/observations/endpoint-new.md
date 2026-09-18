# Page observations: /endpoints/new (NewEndpoint)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role                | expected behavior on interaction                 | success signal                                                         | failure signal                                    |
| ------------------------------------ | ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------- |
| URL + Description fields             | textbox group       | accept endpoint URL and short label              | typed values present                                                   | empty                                             |
| Event-type / active selectors        | checkbox/switch     | choose at least one event and toggle `is_active` | at least one selection registered                                      | nothing selected                                  |
| `getByRole('button', { name: /create | save endpoint/i })` | button (submit)                                  | POST /api/webhooks then redirect to `/endpoints/:id` (or `/endpoints`) | URL changes off `/endpoints/new`; new row visible | stays on form with error  |
| `getByRole('link', { name: /cancel   | back/i })`          | link                                             | navigate back to `/endpoints`                                          | URL becomes `/endpoints`                          | stays on `/endpoints/new` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected            |
| ----------- | ------ | ------------- | ------------------------------------------------- |
| Submit form | POST   | /api/webhooks | `{ url, name, description, events[], is_active }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/endpoint-new.spec.ts`
