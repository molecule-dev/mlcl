# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).
- [x] User row exists in DB; settings persisted to `users.oauthData.fleetSettings` (PATCH /api/users/:id).

## Elements

| selector / accessible name                                          | role       | expected behavior on interaction                                       | success signal                                     | failure signal             |
| ------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| `getByText(/^operations & dispatch$/i)`                             | text       | uppercase eyebrow above heading                                        | visible                                            | absent                     |
| `getByRole('heading', { name: /^settings$/i, level: 1 })`           | heading    | page heading                                                           | heading visible                                    | shell error                |
| `getByRole('navigation', { name: /settings sections/i })`           | navigation | sidebar nav                                                            | landmark                                           | missing                    |
| `getByRole('button', { name: /^organization$/i })` (default active) | button     | switch to organization section, aria-current=page                      | section visible                                    | unchanged                  |
| `getByRole('button', { name: /^thresholds$/i })`                    | button     | switch to thresholds section                                           | section visible                                    | unchanged                  |
| `getByRole('button', { name: /^notifications$/i })`                 | button     | switch to notifications section                                        | section visible                                    | unchanged                  |
| Org section "Organization name" textbox                             | textbox    | edits `settings.organizationName`                                      | typed value persists in component state            | input not editable         |
| Org section "Timezone" textbox                                      | textbox    | edits `settings.timezone`                                              | typed value persists                               | not editable               |
| Org section "Dispatch hours" textbox                                | textbox    | edits `settings.dispatchHours`                                         | typed value persists                               | not editable               |
| Thresholds "Speeding threshold" numeric input                       | spinbutton | edits `settings.speedingThreshold`                                     | typed number persists                              | NaN                        |
| Thresholds "Idle threshold" numeric input                           | spinbutton | edits `settings.idleThreshold`                                         | typed number persists                              | NaN                        |
| Thresholds "Low fuel threshold" numeric input                       | spinbutton | edits `settings.fuelThreshold`                                         | typed number persists                              | NaN                        |
| Thresholds "Detect hard braking" checkbox                           | checkbox   | toggles `settings.detectHardBrake`                                     | check-state flips                                  | unchanged                  |
| Thresholds "Detect hard acceleration" checkbox                      | checkbox   | toggles `settings.detectHardAccel`                                     | check-state flips                                  | unchanged                  |
| Notifications "Speeding alerts" checkbox                            | checkbox   | toggles `settings.notifySpeeding`                                      | check-state flips                                  | unchanged                  |
| Notifications "Maintenance reminders" checkbox                      | checkbox   | toggles `settings.notifyMaintenance`                                   | check-state flips                                  | unchanged                  |
| Notifications "Geofence breaches" checkbox                          | checkbox   | toggles `settings.notifyGeofence`                                      | check-state flips                                  | unchanged                  |
| Notifications "Weekly performance digest" checkbox                  | checkbox   | toggles `settings.notifyWeekly`                                        | check-state flips                                  | unchanged                  |
| `getByRole('button', { name: /save changes/i })`                    | button     | PATCH /api/users/:id with `{ oauthData: { ...prior, fleetSettings } }` | "Saved." chip appears, persists across page reload | "Failed to save settings." |

## Hidden surfaces opened from this page

| trigger                                  | what it opens           | elements inside (selector / role / behavior)     |
| ---------------------------------------- | ----------------------- | ------------------------------------------------ |
| Click "Thresholds" / "Notifications" tab | swap right-side section | each section has its own form fields (see above) |

## Network calls expected during normal use

| trigger              | method | path           | what request body or query is expected                       |
| -------------------- | ------ | -------------- | ------------------------------------------------------------ |
| Initial mount        | GET    | /api/users/me  | returns `{ id, oauthData: { fleetSettings? } }`              |
| Click "Save changes" | PATCH  | /api/users/:id | `{ oauthData: { ...existing, fleetSettings: <new state> } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
