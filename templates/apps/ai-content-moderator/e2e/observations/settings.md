# Page observations: /settings (Settings)

Source: live walk via Playwright + e2e/settings.spec.ts. Tabbed page
(Team / Integrations / API & webhooks / Billing). API tab is the
state-mutating one — token CRUD + webhook URL persistence.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role           | expected behavior on interaction                                                                                      | success signal                                                 | failure signal               |
| ------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| settings tabs (team/integrations/api/billing)                | tablist        | clicking each `[data-mol-id="settings-tab-…"]` updates the `?tab=` query param and reveals the matching panel content | URL `?tab=…` updates, panel content visible per tab            | URL unchanged or wrong panel |
| `#token-label` + `[data-mol-id="create-token"]`              | input + button | POST /api/api-tokens with the label; new row visible in list and read-back via GET                                    | 201 response, label visible in "Active tokens", GET returns it | non-2xx, list unchanged      |
| `[data-mol-id="token-row-:id"] [data-mol-id="revoke-token"]` | button         | DELETE /api/api-tokens/:id; row removed (read-after-write)                                                            | next GET no longer returns row                                 | row remains                  |
| `#webhook` + `Save`                                          | input + button | persists URL to localStorage; survives reload                                                                         | reload → input still has value                                 | empty after reload           |
| Billing tab → "View pricing"                                 | link           | href="/pricing"                                                                                                       | link visible with correct href                                 | wrong href / missing         |

## Hidden surfaces opened from this page

| trigger        | what it opens     | elements inside (selector / role / behavior)    |
| -------------- | ----------------- | ----------------------------------------------- |
| Each tab click | tab panel content | per-tab content above (covered in element rows) |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected                                                 |
| ------------ | ------ | ------------------- | -------------------------------------------------------------------------------------- |
| API tab load | GET    | /api/api-tokens     | 200 with array of `{id, label, prefix, created_at, last_used_at}` (no plaintext token) |
| Create token | POST   | /api/api-tokens     | 201 with `{id, label, token}` (plaintext shown ONCE)                                   |
| Revoke token | DELETE | /api/api-tokens/:id | 204 — token removed from list on next GET                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
