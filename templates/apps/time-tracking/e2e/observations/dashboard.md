# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/dashboard.spec.ts).

> auth-protected home for signed-in users. Top bar exposes the global
> timer + "What are you working on?" input. Body shows greeting, KPIs,
> recent entries, and active projects.

## Procedure

1. Sign up first via `signup(page)` (route is auth-protected).
2. `mcp__playwright__browser_navigate` → `/dashboard`
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive each element, observe response, record below.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/dashboard.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                                  | role      | expected behavior on interaction                           | success signal                    | failure signal |
| ----------------------------------------------------------- | --------- | ---------------------------------------------------------- | --------------------------------- | -------------- |
| `[data-test="dashboard"]`                                   | container | renders the dashboard root                                 | element visible                   | missing        |
| `heading "Good day, ..."` (h1)                              | heading   | personal greeting using user name                          | h1 visible with name              | no h1          |
| `button "Start timer"` (top bar play icon)                  | button    | starts global timer; click again to stop and persist entry | timer text advances past 00:00:00 | no advance     |
| `textbox "What are you working on?"`                        | textbox   | description field for the running timer                    | typed value preserved             | missing        |
| `link "View timesheet"` (`/timesheet`)                      | link      | navigate to timesheet                                      | URL ends `/timesheet`             | no nav         |
| `link "View reports"` (`/reports`)                          | link      | navigate to reports                                        | URL ends `/reports`               | no nav         |
| KPI card "Tracked today"                                    | card      | shows tracked-today HMS + delta vs last week               | text visible (default `00:00:00`) | empty          |
| KPI card "This week"                                        | card      | shows weekly tracked total                                 | text visible (default `0h 00m`)   | empty          |
| KPI card "Billable this week"                               | card      | shows billable hours                                       | text visible (default `0h 00m`)   | empty          |
| KPI card "Active projects"                                  | card      | shows project count                                        | numeric value visible             | empty          |
| KPI card "Invoiced this month"                              | card      | shows monthly invoiced revenue                             | dollar amount visible             | empty          |
| `link "View all"` (`/entries`)                              | link      | jump to entries list                                       | URL ends `/entries`               | no nav         |
| `link "Manage"` (`/projects`)                               | link      | jump to projects list                                      | URL ends `/projects`              | no nav         |
| `[data-test="dashboard-empty"]` (when no entries)           | text      | shows "No entries yet" copy when list is empty             | empty-state text visible          | missing        |
| `[data-test="dashboard-projects-empty"]` (when no projects) | text      | shows "No projects yet" copy when project list is empty    | empty-state text visible          | missing        |

## Hidden surfaces opened from this page

| trigger                      | what it opens                          | elements inside (selector / role / behavior)               |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Sidebar `button "New Entry"` | jump to /entries with "Add entry" form | `[data-test="add-entry-form"]` becomes visible on /entries |

## Network calls expected during normal use

| trigger | method | path                            | what request body or query is expected |
| ------- | ------ | ------------------------------- | -------------------------------------- |
| load    | GET    | /api/entries                    | recent entries list                    |
| load    | GET    | /api/projects                   | active projects list                   |
| load    | GET    | /api/users/me (or current user) | user shape used to greet               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
