# Page observations: /study/:deckId (Study)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction                                                | success signal                                           | failure signal           |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| `getByRole("link", { name: /Back to deck/i })`         | link   | navigates to /decks/:deckId                                                     | URL becomes /decks/<uuid>                                | stays on /study          |
| flashcard surface (FlashcardSurface)                   | button | click flips the card; back face becomes visible                                 | after click, answer buttons grid appears                 | card stays on front face |
| answer button "Again" (`[data-mol-id="answer-again"]`) | button | POST /api/study/review with quality=0; advances queue, increments session.again | POST 200; card index advances                            | no POST fired            |
| answer button "Hard" (`[data-mol-id="answer-hard"]`)   | button | POST /api/study/review with quality=3; advances                                 | POST 200; index advances                                 | no POST fired            |
| answer button "Good" (`[data-mol-id="answer-good"]`)   | button | POST /api/study/review with quality=4; advances                                 | POST 200 with updated card row; review_log entry created | no POST fired            |
| answer button "Easy" (`[data-mol-id="answer-easy"]`)   | button | POST /api/study/review with quality=5; advances                                 | POST 200; SM-2 schedule advances                         | no POST fired            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                          | method | path                        | what request body or query is expected                            |
| -------------------------------- | ------ | --------------------------- | ----------------------------------------------------------------- |
| load page                        | GET    | /api/decks/:deckId          | single deck row                                                   |
| load page                        | GET    | /api/study/deck/:deckId/due | list of due cards for this deck                                   |
| load page (fallback when no due) | GET    | /api/cards?deck_id=:deckId  | fallback list of cards                                            |
| click an answer button           | POST   | /api/study/review           | {card_id,quality}; 200 with updated card; review_log row inserted |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
