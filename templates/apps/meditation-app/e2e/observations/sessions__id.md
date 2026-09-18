# Page observations: /sessions/:id (SessionPlayer)

Session player by id-or-slug. Asserts player chrome, hero render, and history POST on completion.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role                    | expected behavior on interaction                                                                                       | success signal                                                 | failure signal                            |
| --------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| session title heading                   | heading                 | renders the session title fetched from /api/sessions/:id                                                               | heading text matches API title                                 | heading missing/loading forever           |
| `getByRole("button", { name: /play      | pause/i })` (transport) | button                                                                                                                 | toggles playback state; clicking start kicks the elapsed timer | button label flips between play and pause | button no-op            |
| `getByRole("button", { name: /replay_10 | forward_30              | skip/i })` (skip controls)                                                                                             | button                                                         | rewinds/skips the elapsed counter         | elapsed display updates | no change |
| completion → history persisted          | effect                  | when elapsed >= duration the player POSTs /api/history with { session_id, duration_seconds, started_at, completed_at } | /api/history returns 201 and a follow-up GET shows the new row | no history row created                    |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected                           |
| ------------ | ------ | ------------------- | ---------------------------------------------------------------- |
| initial load | GET    | /api/sessions/:id   | 200 with session row                                             |
| initial load | GET    | /api/categories/:id | 200 with category (best-effort)                                  |
| completion   | POST   | /api/history        | { session_id, duration_seconds, started_at, completed_at } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
