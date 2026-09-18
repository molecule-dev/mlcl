# Page observations: /workspace (Workspace members & roles)

> Authenticated. Workspace dashboard showing KPIs (totalBoards,
> totalCollaborators), a members table aggregated across all boards
> the user owns, role filters (editor / commenter / viewer), and an
> invite form that POSTs /api/collaborators/:boardId.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                   | role      | expected behavior on interaction                                                                                                                                                                                                     | success signal                                         | failure signal             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------- |
| empty state (`workspace-kpi-totalBoards` = "0" + `workspace-kpi-totalCollaborators` = "0" + `workspace-empty`)                               | composite | fresh user with no boards sees zero KPIs and an empty-state message                                                                                                                                                                  | both KPIs read "0" + empty container visible           | non-zero or empty hidden   |
| populated KPIs + members table (`workspace-kpi-totalBoards`/`-totalCollaborators` = "1" + `workspace-members` contains invitee email + role) | composite | seeding a board + inviting a collaborator bumps both KPIs to "1" and the members table renders the invitee email + role text                                                                                                         | KPIs both "1", members table contains email + "editor" | wrong KPIs or empty table  |
| invite form lifecycle (`workspace-invite-toggle` → `workspace-invite-form` → `-board` + `-email` + `-role` → `-submit` → `-status`)          | composite | toggling reveals the form; selecting a board, filling email, picking commenter, and submitting POSTs /api/collaborators/:boardId; status banner appears and GET /api/collaborators/:boardId includes the invitee with role=commenter | status visible + DB row matches                        | DB unchanged or wrong role |
| role filters (`workspace-filter-editor` + `workspace-filter-viewer`)                                                                         | composite | seeding two collaborators with different roles, the editor filter shows only the editor and hides the viewer; the viewer filter shows the inverse                                                                                    | members text matches expected role per filter          | filter not applied         |

## Hidden surfaces opened from this page

| trigger                                   | what it opens | elements inside                                |
| ----------------------------------------- | ------------- | ---------------------------------------------- |
| `[data-mol-id="workspace-invite-toggle"]` | invite form   | board select, email input, role select, submit |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected                  |
| ------------- | ------ | --------------------------- | ------------------------------------------------------- |
| page load     | GET    | /api/boards                 | 200 array of owned boards                               |
| page load     | GET    | /api/collaborators/:boardId | 200 array (one call per owned board)                    |
| Invite submit | POST   | /api/collaborators/:boardId | `{ email, role }`; 2xx returns the new collaborator row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/properies) is observed
- [x] All elements above have a corresponding test in `e2e/workspace.spec.ts`
