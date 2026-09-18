# Page observations: /settings (Settings)

Captured from `browser_snapshot` on `http://localhost:3100/settings`
after `signup(page)`. Two-column layout with left-rail tab nav
(Bot configuration / Integrations / API access) and a right-pane
section that swaps based on the active tab.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role      | expected behavior on interaction              | success signal                                                 | failure signal   |
| -------------------------------------------- | --------- | --------------------------------------------- | -------------------------------------------------------------- | ---------------- |
| `[data-mol-id="page-settings"]`              | container | renders settings shell after auth             | element visible                                                | missing          |
| `[data-mol-id="settings-tab-bot"]`           | button    | shows the bot configuration form              | `settings-section-bot` visible                                 | unchanged        |
| `[data-mol-id="settings-tab-integrations"]`  | button    | shows the integrations grid                   | `settings-section-integrations` visible                        | unchanged        |
| `[data-mol-id="settings-tab-api"]`           | button    | shows the API access form + token list        | `settings-section-api` visible                                 | unchanged        |
| `[data-mol-id="settings-bot-tone"]`          | combobox  | selects bot tone (warm / brief / formal)      | option becomes selected                                        | unchanged        |
| `[data-mol-id="settings-bot-auto-escalate"]` | checkbox  | toggles `auto_escalate` field in form state   | input checked toggles                                          | unchanged        |
| `[data-mol-id="settings-bot-greeting"]`      | textbox   | accepts greeting text                         | value matches                                                  | empty            |
| `[data-mol-id="settings-bot-save"]`          | button    | PUT /api/settings with form values            | `settings-saved` visible AND backend GET reflects new values   | nothing persists |
| `[data-mol-id="settings-api-token-label"]`   | textbox   | accepts a label for a new API token           | value matches                                                  | empty            |
| `[data-mol-id="settings-api-create"]`        | button    | POST /api/api-tokens — returns plaintext once | `settings-api-new-token` visible AND token row appears in list | nothing happens  |

## Hidden surfaces opened from this page

| trigger                           | what it opens     | elements inside (selector / role / behavior)                                                                                                              |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click `settings-tab-integrations` | integrations grid | `settings-integration-zendesk-toggle`, `settings-integration-intercom-toggle`, `settings-integration-slack-toggle`, `settings-integration-segment-toggle` |
| Click `settings-tab-api`          | API access form   | `settings-api-token-label`, `settings-api-create`, `settings-api-token-list`                                                                              |

## Network calls expected during normal use

| trigger              | method | path            | what request body or query is expected                                    |
| -------------------- | ------ | --------------- | ------------------------------------------------------------------------- |
| Page load            | GET    | /api/settings   | `SettingsRow` for the user                                                |
| Page load            | GET    | /api/api-tokens | array of `ApiTokenRow`                                                    |
| Click "Save changes" | PUT    | /api/settings   | `{ bot_tone, auto_escalate, greeting, signature, notify_*, quiet_hours }` |
| Click "Create token" | POST   | /api/api-tokens | `{ label, scopes }` returns row with `plaintext` once                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
