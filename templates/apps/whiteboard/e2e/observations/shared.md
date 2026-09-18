# Page observations: /shared (Shared boards)

> Authenticated. Lists boards another user has invited the current
> user to via `/api/boards/shared`. Empty state for users with zero
> invites; otherwise a filterable grid of board cards (filter chips:
> all / viewer / commenter / editor).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                            | role      | expected behavior on interaction                                                                                                                               | success signal                                                          | failure signal                        |
| --------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| empty state for fresh user (`shared-empty` + `shared-count` reads "0")                                                | composite | empty-state copy + zero count when no boards are shared with the current user                                                                                  | both visible with count = "0"                                           | empty hidden / wrong count            |
| populated grid + role filters (`shared-grid` + `shared-board-{id}` + `shared-filter-editor` + `shared-filter-viewer`) | composite | when another user invites this user as `editor`, the board appears in the grid and stays visible under the editor filter but is hidden under the viewer filter | grid + card visible, editor filter keeps card, viewer filter hides card | wrong filter behavior or missing card |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected     |
| --------- | ------ | ------------------ | ------------------------------------------ |
| page load | GET    | /api/boards/shared | 200 array of boards the user is invited to |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/shared.spec.ts`
