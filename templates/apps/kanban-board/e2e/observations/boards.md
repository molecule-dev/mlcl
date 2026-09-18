# Page observations: /boards (Boards)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction            | success signal                                                | failure signal                  |
| --------------------------------------------------------- | --------- | ------------------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| `getByText(/No boards yet/i)`                             | heading   | empty state for fresh user                  | visible heading + "Create your first board" body              | never appears                   |
| `getByTestId("boards-empty-create")`                      | button    | opens create dialog (PromptDialog)          | dialog appears with name field                                | dialog never opens              |
| `getByLabel(/Board name/i)` (in dialog)                   | textbox   | accepts board name                          | input has typed value                                         | empty / reset                   |
| `getByRole("button", { name: /Create board/i })` (dialog) | button    | POSTs /api/boards; navigates to /boards/:id | URL becomes /boards/:uuid + board appears in /api/boards list | dialog stays open / 4xx         |
| `getByText(<board.name>)` (after create)                  | text/link | row in boards grid linking to /boards/:id   | clicking navigates to that board                              | row missing / wrong destination |

## Hidden surfaces opened from this page

| trigger             | what it opens | elements inside (selector / role / behavior)                                                 |
| ------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| boards-empty-create | PromptDialog  | `getByLabel(/Board name/i)`, `getByRole("button", { name: /Create board/i })`, cancel button |

## Network calls expected during normal use

| trigger       | method | path        | what request body or query is expected |
| ------------- | ------ | ----------- | -------------------------------------- |
| load /boards  | GET    | /api/boards | response: array of board rows          |
| submit create | POST   | /api/boards | { name }; response 201 with new board  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
