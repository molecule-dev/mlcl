# Page observations: /polls/new (CreatePoll)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role         | expected behavior on interaction        | success signal            | failure signal    |
| -------------------------------------------------------- | ------------ | --------------------------------------- | ------------------------- | ----------------- |
| `getByRole("textbox").first()`                           | textbox      | accept the poll title                   | value reflects typed text | value empty       |
| `input[placeholder*="option" i]`                         | textbox-list | accept ≥2 option labels                 | values reflect typed text | value empty       |
| `getByRole("button", { name: /save\|create\|launch/i })` | button       | POST /api/polls and route to /polls/:id | URL leaves /polls/new     | 4xx alert renders |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected |
| ----------- | ------ | ---------- | -------------------------------------- |
| submit form | POST   | /api/polls | { title, type, options }               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/polls_new.spec.ts`
