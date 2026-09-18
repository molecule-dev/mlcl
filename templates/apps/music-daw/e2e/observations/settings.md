# Page observations: /settings (Settings)

> Filled from a Playwright MCP walk of the live app. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                                                                | success signal                                         | failure signal       |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------- |
| `getByRole('heading', { name: /^Settings$/ })`   | heading  | page h1                                                                                         | visible                                                | missing              |
| `#settings-handle`                               | textbox  | profile handle text input                                                                       | accepts text                                           | missing              |
| `#settings-city`                                 | textbox  | city text input                                                                                 | accepts text                                           | missing              |
| `#settings-bio`                                  | textarea | short bio text area                                                                             | accepts text                                           | missing              |
| `getByRole('button', { name: /save profile/i })` | button   | PUT `/api/preferences` `{ data: { handle, bio, city, … } }` and shows "Profile updated." status | status `role="status"` visible, GET returns same       | no PUT or no status  |
| Output device `<select>`                         | combobox | changes `audioDevice` and PUTs preferences immediately                                          | next GET returns updated value, persists across reload | reverts              |
| Sample rate `<select>`                           | combobox | changes `sampleRate` and PUTs preferences                                                       | persists                                               | reverts              |
| Buffer size `<select>`                           | combobox | changes `bufferSize` and PUTs preferences                                                       | persists                                               | reverts              |
| MIDI controller `<select>`                       | combobox | changes `midiInput` and PUTs preferences                                                        | persists                                               | reverts              |
| Metronome toggle `role="switch"`                 | switch   | toggles `metronome`; aria-checked flips; persists                                               | reload returns same `metronome`                        | reverts              |
| Auto-save toggle `role="switch"`                 | switch   | toggles `autoSave`; persists                                                                    | reload returns same                                    | reverts              |
| Push-notifications toggle `role="switch"`        | switch   | toggles `pushNotifications`; persists                                                           | reload returns same                                    | reverts              |
| `getByRole('link', { name: /manage billing/i })` | link     | bottom card link → `/settings/billing`                                                          | URL becomes `/settings/billing`                        | stays on `/settings` |
| keyboard shortcuts list                          | list     | static `<ul>` of 8 shortcut + binding rows; doc-only                                            | rows visible                                           | missing              |
| anonymous `/settings`                            | n/a      | AuthGuard redirect                                                                              | URL = `/login`                                         | renders anonymously  |

## Hidden surfaces opened from this page

| trigger | what it opens                        | elements inside (selector / role / behavior) |
| ------- | ------------------------------------ | -------------------------------------------- |
| (none)  | settings is one long form; no modals | n/a                                          |

## Network calls expected during normal use

| trigger           | method | path               | what request body or query is expected                               |
| ----------------- | ------ | ------------------ | -------------------------------------------------------------------- |
| initial load      | GET    | `/api/preferences` | current prefs row                                                    |
| profile save      | PUT    | `/api/preferences` | `{ data: { handle, bio, city, … } }`                                 |
| any select change | PUT    | `/api/preferences` | `{ data: { audioDevice / sampleRate / bufferSize / midiInput, … } }` |
| any toggle change | PUT    | `/api/preferences` | `{ data: { metronome / autoSave / pushNotifications, … } }`          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
