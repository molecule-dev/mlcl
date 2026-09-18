# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role     | expected behavior on interaction                                                   | success signal                                                       | failure signal            |
| --------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| `getByRole('heading', { name: /^Settings$/i, level: 1 })` | heading  | page title renders                                                                 | h1 visible                                                           | h1 missing                |
| `getByLabel(/Default tone preset/i)`                      | combobox | selects a tone preset; persists via PUT /api/preferences                           | selected value retained; `GET /api/preferences` returns the new tone | preferences not persisted |
| `[data-mol-id="settings-auto-save"]`                      | switch   | toggles `auto_save` preference                                                     | `aria-checked` flips; persists                                       | preference not persisted  |
| `[data-mol-id="settings-ai-suggestions"]`                 | switch   | toggles `ai_suggestions` preference                                                | `aria-checked` flips; persists                                       | preference not persisted  |
| `[data-mol-id="settings-notify-email"]`                   | switch   | toggles `notify_email` preference                                                  | `aria-checked` flips; persists                                       | preference not persisted  |
| `getByRole('button', { name: /Save preferences/i })`      | button   | persists prefs via PUT /api/preferences and shows "Saved"                          | "Saved" status visible; reload-and-refetch returns saved values      | save failed               |
| `[data-mol-id^="settings-integration-toggle-"]` (first)   | button   | toggles connect/disconnect for an integration via POST or DELETE /api/integrations | `GET /api/integrations` reflects new connected state                 | toggle didn't persist     |
| `getByRole('button', { name: /Sign out/i })`              | button   | clears auth and navigates to /login                                                | URL becomes `/login`; no JWT in localStorage                         | session not cleared       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                            | what request body or query is expected                              |
| ---------------------- | ------ | ------------------------------- | ------------------------------------------------------------------- |
| initial render         | GET    | /api/integrations               | returns `{ integrations: [...] }`                                   |
| initial render         | GET    | /api/preferences                | returns `{ default_tone, auto_save, ai_suggestions, notify_email }` |
| Save preferences       | PUT    | /api/preferences                | echoes saved row → 200                                              |
| Connect integration    | POST   | /api/integrations/connect       | `{ provider }` → 201 with `{ credentialId, connected }`             |
| Disconnect integration | DELETE | /api/integrations/:credentialId | → 204                                                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
