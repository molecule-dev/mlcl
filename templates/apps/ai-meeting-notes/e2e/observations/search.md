# Page observations: /search (Search)

> Authenticated. Single search box + four filter pills. As the user
> types, the page debounces / re-fetches /api/search and renders one
> card per matching transcript segment with highlight markup.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role        | expected behavior on interaction  | success signal      | failure signal  |
| ------------------------------------------------ | ----------- | --------------------------------- | ------------------- | --------------- |
| `getByRole('heading', { name: /^search$/i })`    | heading     | identifies the page               | h1 visible          | empty page      |
| `getByRole('searchbox')`                         | textbox     | fires GET /api/search?q=… on type | results render      | nothing happens |
| `getByText(/type to search transcripts/i)`       | hint        | empty-state copy when no query    | text visible        | wrong copy      |
| `getByRole('button', { name: /all time/i })`     | button      | filter pill, sets `filter=all`    | pill becomes active | no change       |
| `getByRole('button', { name: /last 7 days/i })`  | button      | sets `filter=last7d`              | pill active         | no change       |
| `getByRole('button', { name: /last 30 days/i })` | button      | sets `filter=last30d`             | pill active         | no change       |
| `getByRole('button', { name: /mentions me/i })`  | button      | sets `filter=mentions`            | pill active         | no change       |
| `page.locator('[data-mol-id="nav-search"]')`     | sidebar nav | sidebar shell rendered            | element visible     | layout broken   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger               | method | path        | what request body or query is expected                    |
| --------------------- | ------ | ----------- | --------------------------------------------------------- |
| Type in the searchbox | GET    | /api/search | `q`, `filter` query string; returns enriched segment hits |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-search.spec.ts`
