# Page observations: /auctions (BrowseAuctions)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role      | expected behavior on interaction          | success signal          | failure signal      |
| -------------------------------------------------------------- | --------- | ----------------------------------------- | ----------------------- | ------------------- |
| `getByRole("heading", { name: /Browse auctions/i, level: 1 })` | heading   | render page title                         | visible                 | absent              |
| `getByRole("searchbox")`                                       | searchbox | accept search text                        | value reflects input    | value empty         |
| `getByRole("combobox", { name: /Sort by/i })`                  | combobox  | change sort order                         | selected option matches | selection unchanged |
| `getByRole("button", { name: /Fine art/i })`                   | button    | filter by category, refetch /api/auctions | request issued          | no network call     |
| `getByRole("button", { name: /Watches/i })`                    | button    | filter by category                        | request issued          | no network call     |
| `getByRole("link", { name: /Browse/i }).first()`               | link      | navigate to /auctions (top anchor)        | URL stays /auctions     | navigates elsewhere |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected |
| --------- | ------ | ------------- | -------------------------------------- |
| page load | GET    | /api/auctions | (limit + sort)                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/auctions.spec.ts`
