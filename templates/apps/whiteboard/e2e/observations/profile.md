# Page observations: /profile (Profile)

> Authenticated. The current user's public collaborator card. Hydrates
> from `/api/users/me` + `/api/boards`. Renders display name, stats
> (boards / public / private / collaborators), an empty-state when no
> boards exist, the board grid otherwise, a cursor-color picker that
> persists to localStorage at `whiteboard:cursorColor`, and an "Edit
> profile" link to /settings.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                               | role      | expected behavior on interaction                                                                          | success signal                                                 | failure signal          |
| -------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| header card (`profile-name` + `profile-stats` + `profile-empty-boards`)                                  | composite | renders the signed-in user's first name, the stats wrapper, and the empty-boards section for a fresh user | name contains firstName + stats visible + empty-boards visible | any one missing         |
| stats reflect API state (`profile-stat-boards`, `-publicBoards`, `-privateBoards`, `profile-board-grid`) | composite | counts and grid hydrate from /api/boards after seeding boards                                             | totals "2"/"1"/"1" + grid visible                              | wrong numbers / no grid |
| `[data-mol-id="profile-color-a855f7"]`                                                                   | button    | persists `whiteboard:cursorColor` = '#a855f7' to localStorage                                             | localStorage matches + survives reload                         | preference lost         |
| `[data-mol-id="profile-edit-link"]`                                                                      | link      | nav to /settings                                                                                          | URL becomes `/settings`                                        | broken link             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected          |
| --------- | ------ | ------------- | ----------------------------------------------- |
| page load | GET    | /api/users/me | 200 returns the signed-in user (id, name, etc.) |
| page load | GET    | /api/boards   | 200 array (powers the stats + grid)             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
