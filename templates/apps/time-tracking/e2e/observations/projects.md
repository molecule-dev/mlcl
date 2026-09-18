# Page observations: /projects (Projects list)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/projects.spec.ts).

> auth-protected list of color-coded engagements with budgets and
> burn-down. Toggle reveals the create-project form (rate / budget /
> color / billable). Each row links to /projects/:id.

## Procedure

1. Sign up first via `signup(page)`.
2. `mcp__playwright__browser_navigate` → `/projects`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Open the create form, walk every field; observe billable filter and
   over-budget filter; click a project row to open detail.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/projects.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name         | role        | expected behavior on interaction                                          | success signal                                    | failure signal                 |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------ |
| `[data-test="projects-page"]`      | container   | renders the page root                                                     | element visible                                   | missing                        |
| `heading "Projects"` (h1)          | heading     | page title                                                                | h1 visible                                        | missing                        |
| `[data-test="new-project-toggle"]` | button      | toggles create-project form                                               | `[data-test="new-project-form"]` visibility flips | no toggle                      |
| `[data-test="new-project-form"]`   | form        | new-project form (name, client, rate, budget, color, billable)            | form visible                                      | missing                        |
| `[data-test="project-name"]`       | textbox     | required project name                                                     | typed value preserved                             | submit blocked / accepts empty |
| `[data-test="project-client"]`     | combobox    | optional client selector (defaults to "Internal")                         | selection set                                     | missing                        |
| `[data-test="project-rate"]`       | spinbutton  | hourly rate (USD)                                                         | numeric value preserved                           | missing                        |
| `[data-test="project-budget"]`     | spinbutton  | budget (USD)                                                              | numeric value preserved                           | missing                        |
| `[data-test="project-billable"]`   | checkbox    | sets default billable flag                                                | checked state preserved                           | missing                        |
| `[data-test="project-submit"]`     | button      | POSTs `/api/projects`; new row appears in list and persists across reload | row visible after submit; persists                | row missing                    |
| `[data-test="projects-empty"]`     | empty-state | shown when user has no projects                                           | element visible for fresh user                    | missing                        |
| `[data-test="project-row-<id>"]`   | row         | per-project card; click opens `/projects/:id`                             | row visible; click navigates                      | missing                        |

## Hidden surfaces opened from this page

| trigger                            | what it opens       | elements inside (selector / role / behavior)                               |
| ---------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `[data-test="new-project-toggle"]` | create-project form | name, client, rate, budget, accent-color buttons, billable, submit, cancel |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected                                    |
| ------- | ------ | ------------- | ------------------------------------------------------------------------- |
| load    | GET    | /api/projects | full project list                                                         |
| load    | GET    | /api/clients  | client options for the form                                               |
| submit  | POST   | /api/projects | { name, client_id?, hourly_rate_cents, budget_cents, color, is_billable } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects.spec.ts`
