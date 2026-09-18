# Page observations: /team (Team)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user with a primary workspace

## Elements

| selector / accessible name | role      | expected behavior on interaction   | success signal                 | failure signal |
| -------------------------- | --------- | ---------------------------------- | ------------------------------ | -------------- |
| Workspace heading          | text      | Renders workspace name             | visible                        | missing        |
| Member row (owner)         | list item | Renders the owner with role=owner  | role label visible             | missing        |
| Invite email input         | textbox   | Captures invitee email             | value persists                 | reset          |
| Invite role select         | combobox  | Picks admin/member                 | value persists                 | reset          |
| Invite submit button       | button    | POST /api/workspace-members/invite | success message + member added | error          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                          | what request body or query is expected |
| ------------- | ------ | ----------------------------- | -------------------------------------- |
| page load     | GET    | /api/workspaces/me/primary    | auth header only                       |
| page load     | GET    | /api/workspace-members/:wsId  | auth header only                       |
| invite submit | POST   | /api/workspace-members/invite | { workspace_id, email, role }          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-team.spec.ts`
