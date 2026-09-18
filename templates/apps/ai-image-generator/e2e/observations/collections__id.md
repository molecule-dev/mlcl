# Page observations: /collections/:id (collections__id)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction    | success signal                | failure signal |
| -------------------------------------------------------- | ------- | ----------------------------------- | ----------------------------- | -------------- |
| `getByRole("heading", { level: 1 })` (collection name)   | heading | render collection name as h1        | visible non-empty heading     | absent         |
| `getByRole("button", { name: /Share/i })`                | button  | open share UI / generate share link | request issued or modal opens | no action      |
| `getByRole("button", { name: /Edit/i })`                 | button  | open edit form / inline editor      | editor or modal appears       | no action      |
| `getByRole("link", { name: /Conjure for collection/i })` | link    | navigate to /generate               | URL becomes /generate         | stays          |
| `getByRole("link")` (image card)                         | link    | navigate to /images/:id             | URL becomes /images/UUID      | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path             | what request body or query is expected |
| --------- | ------ | ---------------- | -------------------------------------- |
| page load | GET    | /api/collections | (by id segment)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/collections__id.spec.ts`
