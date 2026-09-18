# Page observations: /decks/:deckId (DeckDetail)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                              | role   | expected behavior on interaction            | success signal                        | failure signal  |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------- | ------------------------------------- | --------------- |
| `getByRole("link", { name: /All decks/i })`                             | link   | navigates back to /decks                    | URL becomes /decks                    | stays on detail |
| `getByRole("link", { name: /New card/i })`                              | link   | navigates to /decks/:id/cards/new           | URL becomes …/cards/new               | stays on detail |
| `getByRole("link", { name: /Study \d+ due/i })` (only when due_count>0) | link   | navigates to /study/:deckId                 | URL becomes /study/<uuid>             | stays on detail |
| card-state filter buttons (All/New/Learning/Review/Relearning)          | button | narrows the card list to the selected state | aria-pressed flips; row count updates | list unchanged  |
| card row link (per card)                                                | link   | navigates to /decks/:id/cards/:cardId/edit  | URL becomes …/cards/<cardId>/edit     | stays on detail |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| load page | GET    | /api/decks/:deckId         | single deck row including counts       |
| load page | GET    | /api/cards?deck_id=:deckId | list of cards for this deck            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
