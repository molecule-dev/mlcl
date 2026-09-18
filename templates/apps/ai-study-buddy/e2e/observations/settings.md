# Page observations: /settings (Settings)

Captured by walking the live settings page (vite=3110, api=4110) after a
fresh `mlcl create`. Auth-protected — sign up first.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role      | expected behavior on interaction                                                                          | success signal                                                         | failure signal                              |
| --------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `[data-mol-id="page-settings"]`                                       | container | the page shell renders after auth                                                                         | element visible                                                        | element absent (auth gate redirect)         |
| `[data-mol-id="settings-nav-preferences"]`                            | link      | switches the active section to "Preferences" via `?s=preferences`                                         | aria-pressed=true; `settings-section-preferences` visible              | URL didn't change                           |
| `[data-mol-id="settings-nav-reminders"]`                              | link      | switches to "Reminders" via `?s=reminders`                                                                | aria-pressed=true; `settings-section-reminders` visible                | URL didn't change                           |
| `[data-mol-id="settings-nav-account"]`                                | link      | switches to "Account" via `?s=account`                                                                    | aria-pressed=true                                                      | URL didn't change                           |
| `input#goal[type=range][min=15][max=120]`                             | slider    | updates the daily-study-goal pending state from 15–120 minutes                                            | minute count badge updates; Save Changes enabled                       | value doesn't update                        |
| `input[type=radio][name=difficulty][value=easy\|medium\|hard]`        | radio     | selects preferred difficulty preset                                                                       | radio is `checked`, label gets the primary highlight                   | radio doesn't switch                        |
| `input[type=checkbox]` (study modes flashcards/quizzes/reading/tutor) | checkbox  | toggles inclusion of that mode in pending settings                                                        | checkbox checked state flips; Save Changes enabled                     | checkbox doesn't toggle                     |
| `getByRole('button', { name: /^cancel$/i })`                          | button    | reverts all pending changes back to the saved state                                                       | sliders/radios/checkboxes snap back; Save Changes disabled             | pending values stay; button stays enabled   |
| `getByRole('button', { name: /^save changes$/i })`                    | button    | persists the pending state to `localStorage[studybuddy:settings]` and surfaces a "Settings saved." status | `role=status` paragraph reads "Settings saved."; values survive reload | error paragraph appears OR no status update |
| `input[type=time]` (Daily reminder time)                              | textbox   | updates `pending.reminderTime` (e.g. `21:00`)                                                             | input value updates; Save Changes enabled                              | value doesn't accept                        |
| `getByRole('switch', { name: /streak freeze available/i })`           | switch    | toggles `streakFreeze` boolean                                                                            | aria-checked flips; persists across save+reload                        | aria-checked doesn't change                 |
| `getByRole('switch', { name: /weekend leniency/i })`                  | switch    | toggles `weekendLeniency` boolean                                                                         | aria-checked flips; persists across save+reload                        | aria-checked doesn't change                 |

## Hidden surfaces opened from this page

| trigger                                                       | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — sections rendered inline via `?s=` query, not modals) | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected              |
| ---------- | ------ | -------------- | --------------------------------------------------- |
| page mount | GET    | `/api/profile` | none — Bearer token; only confirms session validity |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-settings.spec.ts`
