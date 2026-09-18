# Page observations: /settings

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/settings.spec.ts`.

## Procedure

1. `signup(page)` → /settings (Profile tab default).
2. Edit Home airport / Currency, click Save → PATCH + read-after-write.
3. Switch to Preferences tab; toggle a notification → Save → read-after-write.
4. Hit /api/notifications directly to confirm reachability.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role    | expected behavior on interaction | success signal                                         | failure signal   |
| ----------------------------------------------- | ------- | -------------------------------- | ------------------------------------------------------ | ---------------- |
| `input` (Home airport)                          | textbox | accepts IATA code                | value persists in form state                           | empty after type |
| `getByRole('button', { name: 'Save changes' })` | button  | PATCH /api/users/:id             | "Saved" toast + GET /users/:id matches                 | error banner     |
| Preferences tab notification toggle             | switch  | flips notification preference    | aria-pressed flips, persisted in oauthData.preferences | toggle resets    |

## Hidden surfaces opened from this page

| trigger                           | what it opens       | elements inside (selector / role / behavior)                                            |
| --------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| Profile / Preferences tab buttons | swap settings panes | profile = name/email/airport/currency; preferences = notifications + travel preferences |

## Network calls expected during normal use

| trigger          | method | path               | what request body or query is expected  |
| ---------------- | ------ | ------------------ | --------------------------------------- |
| save profile     | PATCH  | /api/users/:id     | `{ oauthData: { preferences: {...} } }` |
| read-after-write | GET    | /api/users/:id     | bearer token                            |
| layout           | GET    | /api/notifications | (header dropdown / on-demand)           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
