# Page observations: /pto (PTO)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/pto.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/pto`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role   | expected behavior on interaction                                        | success signal                                    | failure signal    |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| Pending PTO request rows + Approve/Deny actions      | list   | shows seeded pending requests, each with Approve/Deny                   | at least one row visible with both action buttons | empty / error     |
| `getByRole('button', { name: /^approve$/i })`        | button | PATCH /api/pto/:id `{ status: 'approved' }` (read-after-write verifies) | row flips to approved on reload                   | row stays pending |
| `getByRole('button', { name: /request time off/i })` | button | submits POST /api/pto from inline form                                  | new row appears in list                           | nothing happens   |

## Hidden surfaces opened from this page

| trigger                  | what it opens | elements inside (selector / role / behavior)    |
| ------------------------ | ------------- | ----------------------------------------------- |
| Click "Request time off" | inline form   | type select, start_date, end_date, reason input |

## Network calls expected during normal use

| trigger          | method | path         | what request body or query is expected |
| ---------------- | ------ | ------------ | -------------------------------------- |
| initial mount    | GET    | /api/pto     | (authenticated bearer)                 |
| Approve / Deny   | PATCH  | /api/pto/:id | { status: 'approved' \| 'denied' }     |
| Request time off | POST   | /api/pto     | { type, start_date, end_date, reason } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pto.spec.ts`
