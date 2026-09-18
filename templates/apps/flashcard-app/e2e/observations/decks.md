# Page observations: /decks (Decks)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                      | role     | expected behavior on interaction               | success signal                                          | failure signal                    |
| ------------------------------------------------------------------------------- | -------- | ---------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| `getByRole("button", { name: /New deck/i })`                                    | button   | opens inline create-deck form                  | form with Deck name/Description/Category fields visible | no form opens                     |
| category filter buttons (All/Language/Science/Humanities/Professional/Personal) | button   | filter visible decks by category               | aria-pressed flips and the list narrows                 | list unchanged                    |
| `getByLabel(/Deck name/i)` (in create form)                                     | textbox  | accepts deck name; required                    | value retained, submit enabled                          | value reset                       |
| `getByLabel(/Description/i)` (in create form)                                   | textbox  | accepts optional description                   | value retained                                          | value reset                       |
| `getByLabel(/Category/i)` (in create form)                                      | combobox | selects deck category                          | selected option matches choice                          | value reset                       |
| `getByRole("button", { name: /Create deck/i })`                                 | button   | POST /api/decks then navigate to /decks/:newId | URL changes to /decks/<uuid>                            | stays on /decks with no row added |
| `getByRole("button", { name: /Cancel/i })` (in create form)                     | button   | closes the create form without submitting      | form disappears                                         | form stays open                   |
| deck list link (per row)                                                        | link     | navigates to /decks/:id detail                 | URL becomes /decks/<uuid>                               | 404 or stays on /decks            |

## Hidden surfaces opened from this page

| trigger    | what it opens           | elements inside (selector / role / behavior)                                      |
| ---------- | ----------------------- | --------------------------------------------------------------------------------- |
| + New deck | inline NewDeckForm card | name input, description input, category select, Cancel button, Create deck button |

## Network calls expected during normal use

| trigger            | method | path       | what request body or query is expected             |
| ------------------ | ------ | ---------- | -------------------------------------------------- |
| load /decks        | GET    | /api/decks | list of decks owned by user                        |
| submit create form | POST   | /api/decks | {name,description,category}; 201 with new deck row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
