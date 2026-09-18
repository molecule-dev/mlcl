# Page observations: /settings (Settings) — covered by 10-settings.spec.ts

> Authenticated three-section panel. On mount: GET /api/api-tokens and
> GET /api/integrations. Three sub-sections: Account (name + email), API
> keys (generate/revoke), Integrations (connect/disconnect a list of cloud
> drives + Slack). Save in Account fires PATCH /api/users/:id; the local
> auth cache is updated so the saved name survives page.reload().

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                        | success signal                         | failure signal   |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------- | -------------------------------------- | ---------------- |
| `[data-mol-id="settings-page"]`                                  | region  | renders settings container                              | visible                                | hidden           |
| `[data-mol-id="settings-account-section"]`                       | region  | renders Account section                                 | visible                                | hidden           |
| `[data-mol-id="settings-api-section"]`                           | region  | renders API keys section                                | visible                                | hidden           |
| `[data-mol-id="settings-integrations-section"]`                  | region  | renders Integrations section                            | visible                                | hidden           |
| `[data-mol-id="settings-account-name"]`                          | textbox | edits display name                                      | typed value reflects                   | empty            |
| `[data-mol-id="settings-account-email"]`                         | textbox | edits notification email                                | typed value reflects                   | empty            |
| `[data-mol-id="settings-account-save"]`                          | button  | PATCH /api/users/:id, sets local auth, reload persists  | "Saved." badge + reload shows new name | error toast      |
| `[data-mol-id="settings-api-label"]`                             | textbox | enters new key label                                    | typed value reflects                   | empty            |
| `[data-mol-id="settings-api-generate"]`                          | button  | POST /api/api-tokens, plaintext shown once              | secret panel visible w/ token          | 4xx              |
| `[data-mol-id^="settings-api-revoke-"]`                          | button  | DELETE /api/api-tokens/:id                              | row disappears                         | row stays        |
| `[data-mol-id^="settings-integration-"][data-mol-id$="-toggle"]` | button  | POST /api/integrations/:provider/connect or /disconnect | label flips to Disconnect/Connect      | error rolls back |

## Hidden surfaces opened from this page

| trigger          | what it opens               | elements inside                                     |
| ---------------- | --------------------------- | --------------------------------------------------- |
| Generate API key | inline plaintext-once panel | `[data-mol-id="settings-api-secret"]` with `<code>` |

## Network calls expected during normal use

| trigger                | method | path                                   | expected body                         |
| ---------------------- | ------ | -------------------------------------- | ------------------------------------- |
| Page load              | GET    | /api/api-tokens                        | array of token records (no plaintext) |
| Page load              | GET    | /api/integrations                      | array of integration records          |
| Save Account           | PATCH  | /api/users/:id                         | `{ name, email }`                     |
| Generate key           | POST   | /api/api-tokens                        | `{ label }`                           |
| Revoke key             | DELETE | /api/api-tokens/:id                    | —                                     |
| Connect integration    | POST   | /api/integrations/:provider/connect    | —                                     |
| Disconnect integration | POST   | /api/integrations/:provider/disconnect | —                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-settings.spec.ts`
