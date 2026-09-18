# Page observations: /flashcards/:id (Deck detail / study)

Captured by navigating to a real seeded deck (with at least one card)
and snapshotting via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role      | expected behavior on interaction                | success signal                   | failure signal              |
| ------------------------------------ | --------- | ----------------------------------------------- | -------------------------------- | --------------------------- |
| `[data-mol-id="page-deck"]`          | container | top-level wrapper renders                       | element visible                  | redirected to /login or 404 |
| `[data-mol-id="deck-card-front"]`    | region    | shows the front markdown of the current card    | front text visible               | empty                       |
| `[data-mol-id="deck-card-flip"]`     | button    | toggles the flip animation between front / back | `deck-card-back` becomes visible | nothing flips               |
| `[data-mol-id="deck-card-back"]`     | region    | shows the back markdown after flip              | back text visible                | only front shows            |
| `[data-mol-id="deck-rating-easy"]`   | button    | submits an easy-rating review for current card  | next card loads or session ends  | rating ignored              |
| `[data-mol-id="deck-rating-medium"]` | button    | submits a medium-rating review                  | next card loads                  | rating ignored              |
| `[data-mol-id="deck-rating-hard"]`   | button    | submits a hard-rating review                    | next card loads                  | rating ignored              |

## Hidden surfaces opened from this page

| trigger                | what it opens                                 | elements inside (selector / role / behavior) |
| ---------------------- | --------------------------------------------- | -------------------------------------------- |
| `deck-card-flip` click | flips card to expose `deck-card-back` content | back markdown + rating row visible           |

## Network calls expected during normal use

| trigger      | method | path                                  | what request body or query is expected |
| ------------ | ------ | ------------------------------------- | -------------------------------------- |
| page mount   | GET    | `/api/decks/:id`                      | deck with cards array                  |
| page mount   | GET    | `/api/decks/:id/cards`                | full cards array (paginated)           |
| Rating click | POST   | `/api/decks/:id/cards/:cardId/review` | `{ rating: 'easy'                      | 'medium' | 'hard' }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/22-flashcards__id.spec.ts`
