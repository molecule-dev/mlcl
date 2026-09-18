# Page observations: /endpoints (Endpoints)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction       | success signal                   | failure signal            |
| -------------------------------------------------------- | ------- | -------------------------------------- | -------------------------------- | ------------------------- |
| `getByRole('heading', { name: /endpoints/i, level: 1 })` | heading | renders the page title                 | visible                          | absent                    |
| `getByRole('link', { name: /new endpoint/i })`           | link    | navigate to `/endpoints/new`           | URL becomes `/endpoints/new`     | stays on `/endpoints`     |
| Endpoint row anchors                                     | link    | navigate to `/endpoints/:id`           | URL becomes the id route         | stays / errors            |
| Search input (`input[placeholder*="search" i]`)          | textbox | filter list locally by URL/description | rendered list shrinks to matches | full list still rendered  |
| Empty-state body (`getByText(/no endpoints/i)`)          | text    | shown when zero endpoints exist        | visible when list is empty       | hidden when list is empty |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path          | what request body or query is expected |
| ---------- | ------ | ------------- | -------------------------------------- |
| Page mount | GET    | /api/webhooks | hydrate the endpoints list             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/endpoints.spec.ts`
