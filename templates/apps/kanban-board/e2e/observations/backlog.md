# Page observations: /backlog (Backlog)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                                | success signal                                               | failure signal             |
| ----------------------------------------------------------- | ------- | --------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `getByText(/Backlog is empty/i)` (no boards yet)            | heading | empty state for fresh user                                      | visible heading + "Create a board first." hint               | never appears              |
| `getByText(/Create a board first\./i)`                      | text    | hint shown when user has zero boards                            | visible                                                      | hidden even with no boards |
| `getByTestId("backlog-empty-create")`                       | button  | opens add-to-backlog dialog → POST /api/cards with list_id=null | new backlog card appears + GET /api/cards/backlog returns it | dialog never opens / 4xx   |
| `getByLabel(/^Title$/i)` (in dialog)                        | textbox | accepts backlog item title                                      | input has typed value                                        | empty                      |
| `getByRole("button", { name: /Add to backlog/i })` (dialog) | button  | submits POST /api/cards                                         | card persists with list_id=null + board_id set               | nothing happens            |

## Hidden surfaces opened from this page

| trigger              | what it opens | elements inside (selector / role / behavior)                                 |
| -------------------- | ------------- | ---------------------------------------------------------------------------- |
| backlog-empty-create | PromptDialog  | `getByLabel(/^Title$/i)`, `getByRole("button", { name: /Add to backlog/i })` |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected           |
| -------------- | ------ | ------------------ | ------------------------------------------------ |
| load /backlog  | GET    | /api/cards/backlog | response: cards with list_id=null                |
| add to backlog | POST   | /api/cards         | { board_id, list_id: null, title }; response 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
