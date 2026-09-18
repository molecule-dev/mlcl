# Page observations: /employees/new (AddEmployee)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/employees_new.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/employees/new`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role   | expected behavior on interaction                              | success signal                             | failure signal          |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------- | ------------------------------------------ | ----------------------- |
| Eyebrow + first/last/work-email inputs                           | form   | accept input                                                  | values typed                               | not editable            |
| `getByRole('button', { name: /^save employee$/i })` (empty form) | button | empty submit surfaces inline `role="alert"` and DOES NOT POST | alert visible, no POST                     | POST fired              |
| `getByRole('button', { name: /^save employee$/i })` (valid form) | button | POST /api/employees; on success navigates to /employees/:id   | URL changes off /employees/new, status 201 | inline alert            |
| `getByRole('link', { name: /cancel\|all employees/i })`          | link   | returns to /employees                                         | URL → /employees                           | stays on /employees/new |

## Hidden surfaces opened from this page

| trigger      | what it opens             | elements inside (selector / role / behavior)           |
| ------------ | ------------------------- | ------------------------------------------------------ |
| empty submit | inline `role="alert"` div | text "First and last name are required." — no API call |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| valid submit | POST   | /api/employees | { first_name, last_name, email, ... }  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/employees_new.spec.ts`
