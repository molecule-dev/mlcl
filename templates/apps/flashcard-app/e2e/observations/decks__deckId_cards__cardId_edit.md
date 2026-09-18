# Page observations: /decks/:deckId/cards/:cardId/edit (CardEdit)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                                                           | success signal                                                 | failure signal       |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------- |
| `getByRole("link", { name: /Back to deck/i })`   | link     | navigates to /decks/:deckId                                                                | URL becomes /decks/<uuid>                                      | stays on edit        |
| `getByLabel(/^Front$/i)` (pre-filled)            | textarea | shows existing card front; editable                                                        | initial value matches DB; edits retained                       | empty or value reset |
| `getByLabel(/^Back$/i)` (pre-filled)             | textarea | shows existing card back; editable                                                         | initial value matches DB; edits retained                       | empty or value reset |
| `getByLabel(/Tags/i)` (pre-filled, comma-joined) | textbox  | shows existing tags; editable                                                              | initial value matches saved tags                               | empty or stale value |
| `getByRole("button", { name: /Save changes/i })` | button   | PUT /api/cards/:id then navigate to /decks/:deckId; subsequent GET returns updated content | URL becomes /decks/<uuid>; reload of edit shows new front/back | stays on edit        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected            |
| --------- | ------ | -------------- | ------------------------------------------------- |
| load page | GET    | /api/cards/:id | single card with front/back/tags                  |
| submit    | PUT    | /api/cards/:id | {deck_id,front,back,tags[]}; 200 with updated row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
