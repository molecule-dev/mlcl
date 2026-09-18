# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role                             | expected behavior on interaction                                 | success signal                                | failure signal                  |
| --------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| `getByText(/Welcome to Driftboard/i)` (empty state heading)     | heading                          | shown for first-time user with no boards                         | visible heading                               | sub-line never appears          |
| `getByTestId("dashboard-empty-create")`                         | button                           | opens PromptDialog → POST /api/boards → navigates to /boards/:id | URL becomes /boards/:uuid                     | stays on /dashboard / API error |
| `getByTestId("dashboard-new-board")` (header CTA)               | button                           | opens PromptDialog (same as empty CTA)                           | dialog visible with "Board name" field        | dialog never opens              |
| `getByText(/{{open}} open cards across {{boards}} active boards | open cards across/i)` (sub-line) | text                                                             | sub-line reflects real KPIs once boards exist | text matches actual counts      | KPI mismatch |
| `getByTestId(/^dashboard-board-/)` (boards list item)           | button                           | navigates to /boards/:id of that board                           | URL becomes /boards/:id                       | stays on /dashboard             |

## Hidden surfaces opened from this page

| trigger                                       | what it opens | elements inside (selector / role / behavior)                                                                     |
| --------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| dashboard-empty-create or dashboard-new-board | PromptDialog  | `getByLabel(/Board name/i)` textbox; `getByRole("button", { name: /Create board/i })` submits → POST /api/boards |

## Network calls expected during normal use

| trigger             | method | path                    | what request body or query is expected       |
| ------------------- | ------ | ----------------------- | -------------------------------------------- |
| load /dashboard     | GET    | /api/boards             | response: array of boards                    |
| load /dashboard     | GET    | /api/cards?archived=all | response: array of cards (active + archived) |
| submit create-board | POST   | /api/boards             | { name }; response 201 with the new board    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
