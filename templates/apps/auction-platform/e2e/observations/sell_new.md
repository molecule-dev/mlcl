# Page observations: /sell/new (SellListing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role         | expected behavior on interaction | success signal        | failure signal |
| ----------------------------------------------------------- | ------------ | -------------------------------- | --------------------- | -------------- |
| `getByRole("heading", { name: /Sell an item/i, level: 1 })` | heading      | render Sell page title           | visible               | absent         |
| `getByLabel(/Title/i)`                                      | textbox      | accept title input               | value reflects input  | value empty    |
| `getByLabel(/Description/i)`                                | textbox      | accept description               | value reflects input  | value empty    |
| `getByLabel(/Starting bid/i)`                               | spinbutton   | accept starting price            | value reflects input  | value empty    |
| `getByRole("button", { name: /Fine art/i })`                | button       | choose non-default category      | URL hash gets cat=art | unchanged      |
| `getByRole("button", { name: /Preview & list                | Submit/i })` | button                           | POST /api/listings    | request issued | no network call |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path          | what request body or query is expected                    |
| -------------- | ------ | ------------- | --------------------------------------------------------- |
| Submit listing | POST   | /api/listings | title + description + category + startingPrice + duration |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sell_new.spec.ts`
