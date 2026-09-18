# Page observations: /quiz/:id/lobby (HostLobby)

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated, owner of the quiz. Mounting the page POSTs /api/sessions to mint a new session, then auto-joins the host as participant "Host".

## Elements

| selector / accessible name                                           | role             | expected behavior on interaction                                              | success signal                                                            | failure signal                                      |
| -------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `getByTestId('host-lobby')`                                          | landmark `<div>` | rendered after session creation                                               | element visible                                                           | "Spinning up your lobby…" persists or error visible |
| `getByRole('button', { name: /cancel lobby/i })`                     | button           | navigates back to `/quiz/{id}`                                                | URL = /quiz/{id}                                                          | otherwise                                           |
| Join code hero (large code)                                          | text             | shows session.join_code from POST /api/sessions response                      | join code matches API value                                               | empty/wrong                                         |
| `getByRole('button', { name: /^copy$/i })` (text "content_copyCopy") | button           | writes join_code to clipboard                                                 | "Join code copied to clipboard." status visible (`getByTestId('copied')`) | unchanged                                           |
| `getByRole('button', { name: /start the spark/i })`                  | button           | POST /api/sessions/{id}/start, navigates to /quiz/{id}/play?sessionId={id}    | URL = /quiz/{id}/play with sessionId                                      | error message visible, URL stays /lobby             |
| `getByTestId('player-count')`                                        | badge            | "{count} live"; updates from polling /api/leaderboard/session/{id} every 2.5s | reflects /api/leaderboard/session/{id} length                             | wrong count                                         |
| `getByTestId('player-list')` (when populated)                        | unordered list   | one `<li>` per participant from /api/leaderboard/session/{id}                 | matches API list                                                          | wrong rendering                                     |
| Empty-state copy "Waiting for players. Share code …"                 | paragraph        | shown when no players                                                         | visible when player count is 0                                            | hidden incorrectly                                  |
| House rules section                                                  | section          | static rules list (Faster = more points, Streak multiplier, No skips)         | three rules visible                                                       | missing                                             |

## Hidden surfaces opened from this page

(none — copy button is inline; navigation kicks off from start button)

## Network calls expected during normal use

| trigger                     | method | path                          | body / query                                                   |
| --------------------------- | ------ | ----------------------------- | -------------------------------------------------------------- |
| page mount                  | POST   | /api/sessions                 | `{ quiz_id }`; 201 returns SessionRow `{ id, join_code, ... }` |
| page mount (host self-join) | POST   | /api/sessions/{id}/join       | `{ nickname: 'Host' }`; 201 (or 409 if already joined)         |
| polling                     | GET    | /api/leaderboard/session/{id} | 200 returns participant rows (every 2.5s)                      |
| Start the spark             | POST   | /api/sessions/{id}/start      | `{}`; 200 (sets session.status='active')                       |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] join code visible after session create
- [x] start CTA round-trips to /play with sessionId
- [x] copy CTA confirmed (status text visible)
- [x] all rows have a corresponding test in `e2e/host-lobby.spec.ts`
