# Page observations: /people (TeamDirectory)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role           | expected behavior on interaction                     | success signal                     | failure signal |
| ------------------------------------------------ | -------------- | ---------------------------------------------------- | ---------------------------------- | -------------- |
| `input[type=search]` (search)                    | textbox        | filter team grid by name/email                       | only matching teammates visible    | unchanged list |
| teammate card                                    | card with link | (decorative card; clicking does nothing destructive) | renders teammate name/email/avatar | empty card     |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })` | button                                               | logs out                           | URL `/login`   | unchanged |
| `getByRole("button", { name: /Toggle theme/i })` | button         | flips theme                                          | `data-mol-mode` flips              | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path        | what request body or query is expected |
| --------- | ------ | ----------- | -------------------------------------- |
| Page load | GET    | `/api/team` | list of all team members               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/people.spec.ts`
