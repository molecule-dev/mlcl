# Page observations: /projects/:id (Project detail)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/projects__id.spec.ts).

> auth-protected per-project view: header (client + name + rate +
> budget hours), KPI strip, budget burn-down, recent entries, archive
> button.

## Procedure

1. Sign up first via `signup(page)`; seed a client + project.
2. `mcp__playwright__browser_navigate` → `/projects/:id`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive Archive (confirms via `window.confirm`).
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/projects__id.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); a project must exist.

## Elements

| selector / accessible name                                       | role        | expected behavior on interaction                          | success signal                    | failure signal |
| ---------------------------------------------------------------- | ----------- | --------------------------------------------------------- | --------------------------------- | -------------- |
| `[data-test="project-detail"]`                                   | container   | renders the project root                                  | element visible                   | missing        |
| `link "Projects"` (breadcrumb, `/projects`)                      | link        | navigates back to list                                    | URL ends `/projects`              | no nav         |
| `heading "<project name>"` (h1)                                  | heading     | project name                                              | h1 visible                        | missing        |
| KPI cell "Tracked"                                               | text        | tracked hours so far                                      | text visible (`0h 00m` for fresh) | missing        |
| KPI cell "Remaining"                                             | text        | remaining hours given budget                              | text visible                      | missing        |
| KPI cell "Revenue"                                               | text        | billable revenue                                          | dollar text visible               | missing        |
| `[data-test="project-archive"]`                                  | button      | confirm dialog → soft-archives, removes from default list | row gone after archive            | not gone       |
| `heading "Budget burn-down"` (h2)                                | heading     | renders the burn-down section                             | h2 visible                        | missing        |
| KPI strip "This week / Open invoices / Entries / Billable hours" | text        | summary KPIs                                              | values visible                    | missing        |
| `[data-test="project-entries-empty"]`                            | empty-state | shown when no entries                                     | element visible for fresh project | missing        |
| `link "View all"` (`/entries`)                                   | link        | jump to entries list                                      | URL ends `/entries`               | no nav         |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens           | elements inside (selector / role / behavior)    |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `[data-test="project-archive"]` (with `window.confirm`) | confirms archive intent | `dialog.accept()` → soft-archive, navigate back |

## Network calls expected during normal use

| trigger | method | path                        | what request body or query is expected |
| ------- | ------ | --------------------------- | -------------------------------------- |
| load    | GET    | /api/projects/:id           | the project record                     |
| load    | GET    | /api/entries?project_id=... | entries linked to this project         |
| archive | PATCH  | /api/projects/:id           | { archived: true }                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id.spec.ts`
