# Page observations: /decks/:deckId/cards/new (CardNew)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role     | expected behavior on interaction                                                | success signal                                      | failure signal      |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------- |
| `getByRole("link", { name: /Back to deck/i })`  | link     | navigates to /decks/:deckId                                                     | URL becomes /decks/<uuid>                           | stays on /cards/new |
| `getByLabel(/^Front$/i)`                        | textarea | accepts the card front text; required                                           | value retained                                      | value reset         |
| `getByLabel(/^Back$/i)`                         | textarea | accepts the card back text; required                                            | value retained                                      | value reset         |
| `getByLabel(/Tags/i)`                           | textbox  | accepts comma-separated tags                                                    | value retained                                      | value reset         |
| `getByRole("link", { name: /Cancel/i })`        | link     | navigates to /decks/:deckId without saving                                      | URL becomes /decks/<uuid>                           | stays on /cards/new |
| `getByRole("button", { name: /Create card/i })` | button   | POST /api/cards then navigate to /decks/:deckId; deck card_count must increment | URL becomes /decks/<uuid>; new card appears in list | stays with error    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected             |
| ----------- | ------ | ---------- | -------------------------------------------------- |
| submit form | POST   | /api/cards | {deck_id,front,back,tags[]}; 201 with new card row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
