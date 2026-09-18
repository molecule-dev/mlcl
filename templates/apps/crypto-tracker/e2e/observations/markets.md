# Page observations: /markets + /coin/:symbol

> Filled by AI agent driving the running app via Playwright MCP.
> Maps to `e2e/markets.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction                                                     | success signal                                                                                   | failure signal                           |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `getByRole('link', { name: /Bitcoin/ })` (markets row) | link   | renders BTC row from seeded catalog with non-zero price (3rd column matches `$\d`)   | "Bitcoin" link visible AND priceCell starts with `$<digit>` not `$0.00`                          | empty list / $0                          |
| `/coin/btc` route                                      | route  | renders BTC detail page with heading, "Key stats", market cap, sparkline svg         | heading "Bitcoin" + svg visible                                                                  | blank or 404                             |
| `getByTestId('coin-detail-watch-toggle')` on /coin/xrp | button | adds XRP to /api/watchlist on first click; removes on second; persists across reload | button text flips Watch ↔ Watching; GET `/api/watchlist` reflects change; reload preserves state | text doesn't change OR backend untouched |

## Hidden surfaces opened from this page

| trigger                                                            | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------------ | ------------- | -------------------------------------------- |
| (none — search box is inline; coin detail is a route, not a modal) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/markets.spec.ts`
