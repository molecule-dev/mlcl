# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/settings` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role                 | expected behavior on interaction | success signal                            | failure signal                                                         |
| ------------------------------------ | -------------------- | -------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `getByRole('button', { name: /issue  | new key              | create key/i }).first()`         | button                                    | POSTs `/api/devices/:id/tokens` and reveals the plaintext token ONCE   | plaintext token shown once and immediately authenticates a `/api/telemetry` ingest | revealed twice (security regression) or 4xx |
| `getByRole('button', { name: /revoke | delete/i }).first()` | button                           | DELETE `/api/devices/:id/tokens/:tokenId` | row removed from key list and subsequent ingest with that token is 401 | row stays; ingest still 200                                                        |
| `getByRole('link', { name: /pricing  | upgrade              | plan/i }).first()`               | link                                      | navigates to `/pricing` to pick a paid tier                            | URL becomes `/pricing`                                                             | URL unchanged                               |

## Hidden surfaces opened from this page

| trigger          | what it opens                                            | elements inside (selector / role / behavior)       |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Issue key button | inline panel revealing the plaintext token + copy button | plaintext token text, "Copy" button, "Done" button |

## Network calls expected during normal use

| trigger     | method | path                             | what request body or query is expected       |
| ----------- | ------ | -------------------------------- | -------------------------------------------- |
| page load   | GET    | /api/devices/:id/tokens          | (none)                                       |
| Issue key   | POST   | /api/devices/:id/tokens          | { label }                                    |
| Revoke key  | DELETE | /api/devices/:id/tokens/:tokenId | (none)                                       |
| Test ingest | POST   | /api/telemetry                   | { metric, value, unit } (auth: device token) |
| page load   | GET    | /api/billing/status              | (none)                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
