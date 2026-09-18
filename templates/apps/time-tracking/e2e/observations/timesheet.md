# Page observations: /timesheet (Weekly view)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/timesheet.spec.ts).

> auth-protected weekly grid: hours-per-project per-day, tallied from
> tracked entries. User can scrub backwards/forwards by week.

## Procedure

1. Sign up first via `signup(page)`.
2. `mcp__playwright__browser_navigate` → `/timesheet`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Drive each element, observe response, record below.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/timesheet.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                | role        | expected behavior on interaction              | success signal                      | failure signal |
| ----------------------------------------- | ----------- | --------------------------------------------- | ----------------------------------- | -------------- |
| `[data-test="timesheet-page"]`            | container   | renders the timesheet root                    | element visible                     | missing        |
| `heading "Timesheet"` (h1)                | heading     | page title                                    | h1 visible                          | missing        |
| `[data-test="timesheet-prev"]`            | button      | scrub one week earlier; week label updates    | label changes                       | no change      |
| `[data-test="timesheet-today"]`           | button      | jump to current week                          | label resets to current week range  | no change      |
| `[data-test="timesheet-next"]`            | button      | scrub one week forward; week label updates    | label changes                       | no change      |
| `[data-test="timesheet-empty"]`           | empty-state | empty copy when user has no entries this week | element visible for fresh user      | missing        |
| `[data-test="timesheet-row-<projectId>"]` | row         | one row per project with daily totals         | row appears once entries are seeded | missing        |
| `[data-test="timesheet-total"]`           | row         | daily totals row at bottom                    | totals visible                      | missing        |

## Hidden surfaces opened from this page

(none — no menus or modals)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected           |
| ------- | ------ | ------------- | ------------------------------------------------ |
| load    | GET    | /api/entries  | full entries list (filtered client-side by week) |
| load    | GET    | /api/projects | project labels for the rows                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/timesheet.spec.ts`
