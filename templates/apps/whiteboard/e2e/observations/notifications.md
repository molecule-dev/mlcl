# Page observations: /notifications (Notifications inbox)

> Authenticated. Synthesizes activity rows from the user's real API
> state (collaborator invites prefixed `notification-c-`, version
> snapshots prefixed `notification-v-`, and board-edit activity prefixed
> `notification-b-`). Tab filters narrow visible activity. "Mark all as
> read" stamps `whiteboard:notifications:lastSeen` in localStorage.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                   | role      | expected behavior on interaction                                                                                 | success signal                                   | failure signal             |
| ---------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------- |
| `[data-mol-id="notifications-empty"]`                                        | container | empty-state copy when zero activity sources exist                                                                | visible for fresh user with no boards            | hidden when empty          |
| activity rows (`notification-c-*` / `notification-v-*` / `notification-b-*`) | composite | at least one of invite / snapshot / edit activity rows is visible after seeding a board + collaborator + version | one of the three prefixes' first item is visible | none present after seeding |
| `[data-mol-id="notifications-mark-read"]`                                    | button    | writes `whiteboard:notifications:lastSeen` ISO timestamp to localStorage                                         | non-empty value persisted                        | localStorage unchanged     |
| `[data-mol-id="notifications-tab-snapshot"]`                                 | tab       | filters list to snapshot-only activity                                                                           | invite rows (`notification-c-*`) hidden          | filter not applied         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                        | what request body or query is expected         |
| --------- | ------ | --------------------------- | ---------------------------------------------- |
| page load | GET    | /api/boards                 | 200 array (powers board-edit activity)         |
| page load | GET    | /api/collaborators/:boardId | 200 array per board (powers invite activity)   |
| page load | GET    | /api/versions/:boardId      | 200 array per board (powers snapshot activity) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
