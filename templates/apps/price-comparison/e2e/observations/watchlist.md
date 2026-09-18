# Page observations: /watchlist (Watchlist)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role      | expected behavior on interaction | success signal        | failure signal |
| ---------------------------------------------- | --------- | -------------------------------- | --------------------- | -------------- |
| `[data-test=watchlist-page]` shell             | container | page wrapper                     | rendered              | empty          |
| `[data-test=watchlist-grid]` items grid        | grid      | one card per /api/watchlist row  | ≥1 card after add     | empty          |
| `[data-test=watchlist-remove-<id>]` remove btn | button    | DELETE /api/watchlist/:id        | row disappears        | row remains    |
| filter "Dropped" toggle                        | button    | filters to dropped items only    | only drop_pct>0 cards | filter ignored |
| empty-state CTA link                           | link      | navigates to /search to add      | URL becomes /search   | wrong route    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/watchlist     | auth header only                       |
| remove    | DELETE | /api/watchlist/:id | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/watchlist.spec.ts`
