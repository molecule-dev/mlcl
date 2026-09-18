# Page observations: /settings (Settings)

> Authenticated. Four sections (account, integrations, api_keys, team)
> driven by the `#hash` segment of the URL. Account form persists via
> PATCH /api/profile/me. Integrations toggle via PUT
> /api/settings/integrations/:source. API keys CRUD via /api/api_keys.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                    | success signal                               | failure signal     |
| ------------------------------------------------------- | ------- | --------------------------------------------------- | -------------------------------------------- | ------------------ |
| `[data-mol-id="settings-display-name"]`                 | textbox | accepts the display name                            | input value reflects typed text              | input is read-only |
| `[data-mol-id="settings-organization"]`                 | textbox | accepts the organization name                       | input value reflects typed text              | input is read-only |
| `[data-mol-id="settings-save-account"]`                 | button  | PATCH /api/profile/me with new fields               | success message + values persisted on reload | error message      |
| `[data-mol-id="settings-integration-snowflake-toggle"]` | button  | PUT /api/settings/integrations/snowflake { status } | toggle state flips + flash message           | error flash        |
| `[data-mol-id="settings-apikey-name"]`                  | textbox | accepts the new key name                            | input value reflects typed text              | input is read-only |
| `[data-mol-id="settings-apikey-create"]`                | button  | POST /api/api_keys returning plaintext key once     | plaintext shown + key in list                | error message      |

## Hidden surfaces opened from this page

| trigger             | what it opens           | elements inside                                           |
| ------------------- | ----------------------- | --------------------------------------------------------- |
| Section nav buttons | switches the right pane | account form, integrations list, api_keys form, team list |

## Network calls expected during normal use

| trigger            | method | path                               | expected body                                 |
| ------------------ | ------ | ---------------------------------- | --------------------------------------------- |
| Page load          | GET    | /api/profile/me                    | `{ display_name, email, organization, ... }`  |
| Page load          | GET    | /api/settings                      | `{ organization, preferences, integrations }` |
| Page load          | GET    | /api/api_keys                      | array of API keys                             |
| Save account       | PATCH  | /api/profile/me                    | `{ display_name, email, organization }`       |
| Toggle integration | PUT    | /api/settings/integrations/:source | `{ status }`                                  |
| Create key         | POST   | /api/api_keys                      | `{ name }`                                    |
| Rotate key         | POST   | /api/api_keys/:id/rotate           | (empty)                                       |
| Revoke key         | DELETE | /api/api_keys/:id                  | (empty)                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-settings.spec.ts`
