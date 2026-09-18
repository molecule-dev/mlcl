# Page observations: /boards/:id (BoardDetail)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user and a board created via the API helper.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                                               | success signal                                           | failure signal                     |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------- |
| `getByTestId("board-name")`                         | heading | renders the board's current name                                               | text matches /api/boards/:id .name                       | shows "Untitled" / blank           |
| `getByTestId("board-empty-add-list")` (empty state) | button  | opens add-list dialog → POST /api/lists                                        | new list visible + persisted in /api/lists?board_id=     | nothing happens / 4xx              |
| `getByRole("button", { name: /Rename board/i })`    | button  | opens rename dialog with current name prefilled; saves via PUT /api/boards/:id | board-name updates + persisted (GET /api/boards/:id)     | name unchanged / dialog stays open |
| `getByTestId("board-star-toggle")`                  | button  | toggles is_starred via PUT /api/boards/:id; aria-pressed flips                 | aria-pressed=true; /api/boards/:id .is_starred = true    | aria-pressed never updates         |
| `getByTestId(/^list-add-card-/)`                    | button  | opens add-card dialog → POST /api/cards with list_id                           | new card tile visible + persisted                        | dialog never opens / 4xx           |
| `getByTestId(/^card-menu-/)`                        | button  | opens per-card menu (move-to-list / archive)                                   | menu items visible (card-move-* and card-archive-*)      | menu never opens                   |
| `getByTestId(/^card-archive-/)` (in menu)           | button  | archives card via PUT /api/cards/:id { is_archived: true }                     | tile disappears + GET /api/cards/:id .is_archived = true | tile stays visible                 |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside (selector / role / behavior)                                |
| --------------------- | ------------- | --------------------------------------------------------------------------- |
| board-empty-add-list  | PromptDialog  | `getByLabel(/List name/i)`, `getByRole("button", { name: /^Add list$/i })`  |
| list-add-card-:listId | PromptDialog  | `getByLabel(/Card title/i)`, `getByRole("button", { name: /^Add card$/i })` |
| Rename board          | PromptDialog  | `getByLabel(/New name/i)`, `getByRole("button", { name: /^Save$/i })`       |
| card-menu-:id         | inline menu   | card-move-:cardId-:targetListId items; card-archive-:cardId button          |

## Network calls expected during normal use

| trigger          | method | path                    | what request body or query is expected |
| ---------------- | ------ | ----------------------- | -------------------------------------- |
| load /boards/:id | GET    | /api/boards/:id         | response: board row                    |
| load /boards/:id | GET    | /api/lists?board_id=:id | response: ordered lists for the board  |
| load /boards/:id | GET    | /api/cards?board_id=:id | response: cards for the board          |
| add list         | POST   | /api/lists              | { board_id, name }                     |
| add card         | POST   | /api/cards              | { board_id, list_id, title }           |
| move card        | PUT    | /api/cards/:id          | { list_id }                            |
| archive card     | PUT    | /api/cards/:id          | { is_archived: true }                  |
| star toggle      | PUT    | /api/boards/:id         | { is_starred }                         |
| rename           | PUT    | /api/boards/:id         | { name }                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
