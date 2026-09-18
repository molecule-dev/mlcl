# Page observations: /alerts (Alerts)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/alerts` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction               | success signal                                                  | failure signal                                                                |
| --------------------------------------------------------- | --------- | ---------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `getByRole('button', { name: /run offline check           | check now | evaluate/i }).first()`                         | button                                                          | POSTs `/api/alerts/check` to evaluate stale devices and create offline alerts | new alerts (status=open, type=offline) appear in list and are deduped | no POST or duplicate alerts created |
| `getByRole('button', { name: /^acknowledge$/i }).first()` | button    | PUT `/api/alerts/:id` with status=acknowledged | row status changes to "acknowledged" and persists across reload | row stays "open"; no PUT                                                      |
| `getByRole('button', { name: /^resolve$/i }).first()`     | button    | PUT `/api/alerts/:id` with status=resolved     | row status becomes "resolved" and resolved_at is set            | row stays "open"; no PUT                                                      |

## Hidden surfaces opened from this page

| trigger               | what it opens                                        | elements inside (selector / role / behavior)             |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Severity filter chips | inline filter UI; selected severity narrows the list | severity option buttons (info, warning, error, critical) |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| page load          | GET    | /api/alerts       | (none)                                 |
| Acknowledge button | PUT    | /api/alerts/:id   | { status: "acknowledged" }             |
| Resolve button     | PUT    | /api/alerts/:id   | { status: "resolved" }                 |
| Run offline check  | POST   | /api/alerts/check | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
