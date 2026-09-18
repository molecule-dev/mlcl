# Page observations: /employees (Employees)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/employees.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/employees`.
2. `mcp__playwright__browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction | success signal             | failure signal      |
| ----------------------------------------------------------------- | ------- | -------------------------------- | -------------------------- | ------------------- |
| `getByRole('heading', { name: /employees/i })`                    | heading | static — page heading            | visible                    | missing             |
| `getByRole('link', { name: /alex rivera/i })`                     | link    | navigates to /employees/:id      | URL → /employees/{uuid}    | row missing         |
| `getByPlaceholder(/search/i)`                                     | textbox | filters list by name/title       | row count drops            | filter not applied  |
| `getByRole('button', { name: /on leave/i })`                      | button  | filters status=on-leave          | only on-leave rows visible | filter not applied  |
| `getByRole('link', { name: /\+\s*add employee\|new employee/i })` | link    | navigates to /employees/new      | URL → /employees/new       | stays on /employees |

## Hidden surfaces opened from this page

| trigger        | what it opens            | elements inside (selector / role / behavior)                     |
| -------------- | ------------------------ | ---------------------------------------------------------------- |
| clicking a row | navigates to detail page | header, tabs, edit button (covered in employees__id observation) |

## Network calls expected during normal use

| trigger       | method | path           | what request body or query is expected |
| ------------- | ------ | -------------- | -------------------------------------- |
| initial mount | GET    | /api/employees | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/employees.spec.ts`
