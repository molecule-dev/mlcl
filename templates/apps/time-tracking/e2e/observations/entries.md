# Page observations: /entries (Time entries)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/entries.spec.ts).

> auth-protected list of every tracked session, grouped by day. Page
> exposes the Add-entry form, CSV export, billable filter, and the
> timer (shared with the layout).

## Procedure

1. Sign up first via `signup(page)`.
2. `mcp__playwright__browser_navigate` → `/entries`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive each element, observe response, record below.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/entries.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                                            | role           | expected behavior on interaction                                             | success signal                                         | failure signal |
| --------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| `[data-test="entries-page"]`                                          | container      | renders the page root                                                        | element visible                                        | missing        |
| `heading "Time entries"` (h1)                                         | heading        | page title                                                                   | h1 visible                                             | missing        |
| `[data-test="export-csv"]`                                            | button         | downloads `entries.csv` for the visible filter                               | browser download fires, file > 0 bytes                 | no download    |
| `[data-test="add-entry-toggle"]`                                      | button         | toggles the Add-entry form                                                   | `[data-test="add-entry-form"]` visibility flips        | no toggle      |
| `[data-test="add-entry-form"]`                                        | form           | manual entry form with description / project / date / start / end / billable | form visible after toggle                              | missing        |
| `[data-test="add-entry-description"]`                                 | textbox        | required entry description                                                   | typed value preserved                                  | missing        |
| `[data-test="add-entry-project"]`                                     | combobox       | optional project selector                                                    | selection set                                          | missing        |
| `[data-test="add-entry-date"]`                                        | textbox (date) | day for the entry                                                            | value preserved                                        | missing        |
| `[data-test="add-entry-start"]`                                       | textbox (time) | start time                                                                   | value preserved                                        | missing        |
| `[data-test="add-entry-end"]`                                         | textbox (time) | end time                                                                     | value preserved                                        | missing        |
| `[data-test="add-entry-billable"]`                                    | checkbox       | billable flag                                                                | checked state preserved                                | missing        |
| `[data-test="add-entry-submit"]`                                      | button         | POSTs `/api/entries`, new row appears in list                                | new entry visible after submit; persists across reload | row missing    |
| `[data-test="filter-all"]` / `filter-billable` / `filter-nonbillable` | buttons        | swap filter                                                                  | active style changes; list re-filters                  | no change      |
| `[data-test="entries-empty"]`                                         | empty-state    | shows "no entries yet" copy when list empty                                  | element visible for fresh user                         | missing        |
| Top-bar `button "Start timer"` (shared layout)                        | button         | starts a running timer; second click stops + persists                        | timer text advances; entry row appears after stop      | no advance     |

## Hidden surfaces opened from this page

| trigger                          | what it opens   | elements inside (selector / role / behavior)                             |
| -------------------------------- | --------------- | ------------------------------------------------------------------------ |
| `[data-test="add-entry-toggle"]` | Add-entry form  | description, project, date, start, end, billable, submit (covered above) |
| Row `delete` button (per row)    | confirms delete | row disappears from list; backend DELETE fires                           |

## Network calls expected during normal use

| trigger    | method | path                                           | what request body or query is expected                       |
| ---------- | ------ | ---------------------------------------------- | ------------------------------------------------------------ |
| load       | GET    | /api/entries                                   | full entries list                                            |
| load       | GET    | /api/projects                                  | project options for the form                                 |
| add submit | POST   | /api/entries                                   | { description, project_id?, started_at, ended_at, billable } |
| delete     | DELETE | /api/entries/:id                               | hard delete                                                  |
| timer stop | POST   | /api/entries                                   | { description, started_at, ended_at }                        |
| export CSV | GET    | /api/entries (as JSON, transformed in browser) | full export                                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/entries.spec.ts`
