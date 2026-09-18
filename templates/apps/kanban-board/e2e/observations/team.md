# Page observations: /team (Team)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                                  | success signal                | failure signal          |
| --------------------------------------------------------- | ------- | ----------------------------------------------------------------- | ----------------------------- | ----------------------- |
| `getByText("Total members", { exact: true })` (KPI label) | text    | KPI label rendered                                                | visible                       | label hidden            |
| `getByText(/^1$/)` (Total members value)                  | text    | always 1 — single-seat workspace                                  | exactly "1" rendered          | shows 0 / blank         |
| `getByText(/Active boards/i)` (KPI label)                 | text    | KPI label rendered, value reflects /api/boards                    | visible                       | label hidden            |
| `getByText(/Open cards/i)` (KPI label)                    | text    | KPI label rendered, value reflects /api/cards?archived=all        | visible                       | label hidden            |
| `getByTestId("team-member-self")`                         | article | renders the signed-in user as Owner                               | card visible with Owner badge | card missing            |
| `getByTestId("team-self-name")`                           | text    | renders the user's display name (or fallback "Driftboard Tester") | matches user.name from signup | shows "?" / placeholder |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger    | method | path                    | what request body or query is expected           |
| ---------- | ------ | ----------------------- | ------------------------------------------------ |
| load /team | GET    | /api/boards             | response: array of boards (for activeBoards KPI) |
| load /team | GET    | /api/cards?archived=all | response: array of cards (for open/shipped KPI)  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
