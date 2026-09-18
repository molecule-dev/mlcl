# Page observations: /cards/:id (CardDetail)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a card created via the API helpers.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction                                   | success signal                                                        | failure signal                  |
| -------------------------------------- | ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------- |
| `getByTestId("card-title")`            | heading | renders the card's current title                                   | text matches /api/cards/:id .title                                    | shows blank / wrong title       |
| `getByTestId("card-edit-title")`       | button  | opens edit-title dialog → PUT /api/cards/:id { title }             | title updates + persisted                                             | dialog never opens / save fails |
| `getByTestId("card-edit-description")` | button  | opens edit-description dialog → PUT /api/cards/:id { description } | description updates + persisted as { text }                           | dialog never opens              |
| `getByTestId("card-comment-input")`    | textbox | accepts comment body                                               | input has typed value                                                 | empty                           |
| `getByTestId("card-comment-submit")`   | button  | POSTs /api/comments → comment appears + persists                   | new comment visible + GET /api/comments?card_id= contains it          | comment never appears / 4xx     |
| `getByTestId("card-priority-urgent")`  | button  | sets priority to urgent via PUT /api/cards/:id                     | active class applied + GET /api/cards/:id .priority = "urgent"        | class never updates             |
| `getByTestId("card-archive")`          | button  | archives card; navigates back to /boards/:boardId                  | URL becomes /boards/:boardId + GET /api/cards/:id .is_archived = true | stays on /cards/:id             |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside (selector / role / behavior)                               |
| --------------------- | ------------- | -------------------------------------------------------------------------- |
| card-edit-title       | edit dialog   | `getByLabel(/^Title$/i)`, `getByRole("button", { name: /^Save$/i })`       |
| card-edit-description | edit dialog   | `getByLabel(/^Description$/i)`, `getByRole("button", { name: /^Save$/i })` |

## Network calls expected during normal use

| trigger          | method | path                      | what request body or query is expected |
| ---------------- | ------ | ------------------------- | -------------------------------------- |
| load /cards/:id  | GET    | /api/cards/:id            | response: card row                     |
| load /cards/:id  | GET    | /api/comments?card_id=:id | response: array of comments            |
| post comment     | POST   | /api/comments             | { card_id, body }; response 201        |
| edit title       | PUT    | /api/cards/:id            | { title }                              |
| edit description | PUT    | /api/cards/:id            | { description: { text } }              |
| change priority  | PUT    | /api/cards/:id            | { priority }                           |
| archive          | PUT    | /api/cards/:id            | { is_archived: true }                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
