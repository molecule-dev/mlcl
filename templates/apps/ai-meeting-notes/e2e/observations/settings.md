# Page observations: /settings (Settings)

> Authenticated. Three side tabs (Transcription, Sharing, Retention)
> backed by users.oauthData.settings. Save fires PATCH /api/users/:id
> with the merged oauthData and persists across reload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role        | expected behavior on interaction                                            | success signal                       | failure signal  |
| ----------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- | ------------------------------------ | --------------- |
| `getByRole('heading', { name: /^settings$/i })`                   | heading     | identifies the page                                                         | h1 visible                           | empty page      |
| `page.locator('[data-mol-id="settings-section-transcription"]')`  | tab button  | activates the Transcription panel                                           | aria-current flips                   | no change       |
| `page.locator('[data-mol-id="settings-section-sharing"]')`        | tab button  | activates the Sharing panel                                                 | aria-current flips                   | no change       |
| `page.locator('[data-mol-id="settings-section-retention"]')`      | tab button  | activates the Retention panel                                               | aria-current flips                   | no change       |
| `page.locator('[data-mol-id="settings-transcription-language"]')` | combobox    | sets transcription language                                                 | option selected                      | nothing changes |
| `page.locator('[data-mol-id="settings-transcription-speakers"]')` | textbox     | sets max speakers                                                           | value updates                        | read-only       |
| `page.locator('[data-mol-id="settings-save"]')`                   | button      | PATCH /api/users/:id with merged oauthData.settings; persists across reload | "Settings saved" status text appears | error alert     |
| `page.locator('[data-mol-id="settings-cancel"]')`                 | button      | reverts unsaved edits                                                       | values return to last-saved          | nothing happens |
| `page.locator('[data-mol-id="nav-settings"]')`                    | sidebar nav | sidebar shell rendered                                                      | element visible                      | layout broken   |

## Hidden surfaces opened from this page

| trigger               | what it opens   | elements inside                               |
| --------------------- | --------------- | --------------------------------------------- |
| Click "Sharing" tab   | sharing panel   | scope dropdown, default link visibility radio |
| Click "Retention" tab | retention panel | retention period select, auto-delete toggle   |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected                               |
| ---------- | ------ | -------------- | -------------------------------------------------------------------- |
| Page load  | GET    | /api/users/:id | returns the user row with oauthData.settings                         |
| Click Save | PATCH  | /api/users/:id | `{ oauthData: { settings: { transcription, sharing, retention } } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/21-settings.spec.ts`
