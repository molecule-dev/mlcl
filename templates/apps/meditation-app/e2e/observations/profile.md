# Page observations: /profile (Profile)

User profile + achievements. Asserts derived stats from real history.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                                           | success signal                                    | failure signal  |
| ---------------------------------------------------- | ------- | -------------------------------------------------------------------------- | ------------------------------------------------- | --------------- |
| profile card with name + member-since                | section | renders the signed-in user identity                                        | name visible                                      | card missing    |
| lifetime stats (sessions / minutes / longest streak) | list    | derived from /api/stats/streak + /api/stats/summary + /api/history         | numeric counters visible                          | fields missing  |
| achievements grid                                    | list    | derived from real history thresholds; all-zero account shows locked badges | achievements section visible (locked or unlocked) | section missing |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/stats/streak  | 200                                    |
| initial load | GET    | /api/stats/summary | 200                                    |
| initial load | GET    | /api/history       | 200 with recent rows                   |
| initial load | GET    | /api/preferences   | 200                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
