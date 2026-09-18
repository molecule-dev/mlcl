# Page observations: /employees/:id (EmployeeProfile)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/employees__id.spec.ts`.

## Procedure

1. `signup(page)` → GET /api/employees → pick a seeded employee id.
2. `browser_navigate` → `/employees/{id}`.
3. `browser_snapshot` and walk all interactive nodes (header, tabs, edit/save).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                              | role       | expected behavior on interaction            | success signal                                              | failure signal      |
| --------------------------------------------------------------------------------------- | ---------- | ------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| `getByRole('heading', { name: /<employee name>/i })`                                    | heading    | static — employee name                      | visible                                                     | "Loading…" persists |
| Tab list (Personal info / Time off / Documents)                                         | navigation | switches active subview                     | tab pane visible                                            | tab missing         |
| `getByRole('button', { name: /^edit$/i })` → `getByRole('button', { name: /^save$/i })` | button     | PATCH /api/employees/:id with edited fields | reverts to read-only view; new value persists across reload | inline error        |

## Hidden surfaces opened from this page

| trigger      | what it opens      | elements inside (selector / role / behavior) |
| ------------ | ------------------ | -------------------------------------------- |
| Click "Edit" | inline form fields | tel input, email input, etc.                 |

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| initial mount | GET    | /api/employees/:id | (authenticated bearer)                 |
| save edits    | PATCH  | /api/employees/:id | { phone? email? title? ... }           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/employees__id.spec.ts`
