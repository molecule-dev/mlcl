# Page observations: /study/:deckId/summary (SessionSummary)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction | success signal            | failure signal   |
| -------------------------------------------------------- | ------- | -------------------------------- | ------------------------- | ---------------- |
| `getByRole("heading", { name: /Well done/i, level: 1 })` | heading | renders the celebratory headline | visible h1                | missing heading  |
| `getByRole("link", { name: /Back to dashboard/i })`      | link    | navigates to /dashboard          | URL becomes /dashboard    | stays on summary |
| `getByRole("link", { name: /Back to deck/i })`           | link    | navigates to /decks/:deckId      | URL becomes /decks/<uuid> | stays on summary |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                        | what request body or query is expected                                                                                   |
| ----------------- | ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| load summary page | GET    | /api/study/(no extra calls) | session summary is a static recap; the /api/study handler base must still be exercised by other tests via captureNetwork |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
