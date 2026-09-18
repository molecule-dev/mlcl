# Page observations: /dashboard (Dashboard / Quorum Control Room)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                     | success signal         | failure signal            |
| ---------------------------------------------------------- | ------- | ---------------------------------------------------- | ---------------------- | ------------------------- |
| `getByRole("heading", { name: /quorum control room/i })`   | heading | render page title                                    | visible                | absent                    |
| `[data-test="dashboard-poll-list"]`                        | list    | render the seeded polls (charter / standup / bylaws) | 3 cards visible        | empty list / loader stuck |
| `getByText(/Total polls/i)`                                | text    | render KPI counter                                   | visible with count = 3 | absent                    |
| `getByRole("link", { name: /create\|new poll/i }).first()` | link    | navigate to /polls/new                               | URL becomes /polls/new | stays on /dashboard       |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected                       |
| --------- | ------ | -------------------- | ------------------------------------------------------------ |
| page load | GET    | /api/polls           | (returns 3 seeded polls — single-choice/multi-choice/closed) |
| page load | GET    | /api/results/:pollId | (per-poll tally for dashboard cards)                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
