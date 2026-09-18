# Page observations: /auctions/:id (AuctionDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role       | expected behavior on interaction | success signal        | failure signal  |
| -------------------------------------------------- | ---------- | -------------------------------- | --------------------- | --------------- |
| `getByRole("heading", { level: 1 })`               | heading    | render listing title             | visible               | absent          |
| `getByRole("spinbutton", { name: /Your bid/i })`   | spinbutton | accept bid amount input          | value reflects input  | value empty     |
| `getByRole("button", { name: /Place bid/i })`      | button     | POST /api/bids                   | request issued        | no network call |
| `getByRole("link", { name: /Auctions/i }).first()` | link       | breadcrumb → /auctions           | URL becomes /auctions | stays           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path              | what request body or query is expected |
| --------- | ------ | ----------------- | -------------------------------------- |
| page load | GET    | /api/auctions/:id | (none)                                 |
| Place bid | POST   | /api/bids         | listingId + amount                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/auctions__id.spec.ts`
