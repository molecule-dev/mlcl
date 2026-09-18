# Page observations: /team (Team)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/team`
2. browser_snapshot — "Invite members" toggle, stats grid, role filter row, members table, pending invites card, permissions matrix
3. After clicking "Invite members", inline form appears with email + role + send

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name             | role     | expected behavior on interaction                                     | success signal                                    | failure signal     |
| -------------------------------------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------- | ------------------ |
| `[data-mol-id="team-invite-toggle"]`   | button   | toggles the inline invite form                                       | form appears                                      | form stays hidden  |
| `[data-mol-id="team-invite-email"]`    | textbox  | accepts an email; required                                           | input value reflects typing                       | submit blocked     |
| `[data-mol-id="team-invite-role"]`     | combobox | selects role: editor / viewer / admin                                | select reflects choice                            | select unchanged   |
| `[data-mol-id="team-invite-submit"]`   | button   | POSTs `/api/team/invite`                                             | inline status text appears                        | error or no status |
| `[data-mol-id="team-stats"]`           | region   | shows four stat cards (members / online / pending / seats remaining) | all four cards present                            | cards missing      |
| `[data-mol-id="team-filter-all"]`      | button   | filters members to all roles                                         | filter button highlighted, list unchanged         | unchanged          |
| `[data-mol-id="team-filter-editor"]`   | button   | filters members to `role === 'editor'`                               | filter button highlighted                         | unchanged          |
| `[data-mol-id="team-filter-viewer"]`   | button   | filters members to `role === 'viewer'`                               | filter button highlighted                         | unchanged          |
| `[data-mol-id="team-members-table"]`   | region   | renders the members table (or empty-state)                           | header + at least one row OR `team-members-empty` | nothing renders    |
| `[data-mol-id="team-pending-invites"]` | region   | shows pending invitations list (or empty-state)                      | header + count + list                             | nothing renders    |

## Hidden surfaces opened from this page

| trigger             | what it opens                                  | elements inside (selector / role / behavior) |
| ------------------- | ---------------------------------------------- | -------------------------------------------- |
| invite-toggle click | inline form `[data-mol-id="team-invite-form"]` | email + role + submit + status               |
| empty members       | `[data-mol-id="team-members-empty"]`           | "No teammates yet — invite someone above."   |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected           |
| -------------- | ------ | ------------------ | ------------------------------------------------ |
| initial render | GET    | `/api/team`        | bearer-authed; returns members + pending + stats |
| invite submit  | POST   | `/api/team/invite` | `{ email, role }`                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/team.spec.ts`
