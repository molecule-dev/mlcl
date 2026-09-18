# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/dashboard` (use APP_BASE)
   - Sign up first via `signup(page)`.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                                    | success signal                    | failure signal                    |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| `getByText(/devices/i).first()`                   | text    | renders the fleet KPI section with totals from `/api/reports/fleet` | KPI numbers reflect device counts | "—" placeholders or stale numbers |
| `getByRole('link', { name: /devices/i }).first()` | link    | navigates to `/devices`                                             | URL contains `/devices`           | URL unchanged                     |
| `getByRole('heading').first()`                    | heading | renders the page heading once data has loaded                       | heading text non-empty            | empty page or error               |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/reports/fleet | (none)                                 |
| page load | GET    | /api/devices       | (none)                                 |
| page load | GET    | /api/alerts        | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
