# Page observations: /settings (Settings)

Source: live walk via Playwright + e2e/settings.spec.ts. Five toggle
switches persisted to /api/profile/me.toggles. Plan card reflects
profile.planKey. Export button downloads /api/clips as JSON. Wipe
button clears mol-cache:* and yank-cache:* localStorage keys.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name               | role   | expected behavior on interaction                                                      | success signal                               | failure signal     |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| `[data-mol-id="settings-plan-name"]`     | text   | "Free" by default for a new account                                                   | text matches                                 | wrong              |
| `[data-mol-id="toggle-sync"]` flip       | switch | PATCH /api/profile/me persists toggles[sync]                                          | aria-checked flips + API toggles row updated | no PATCH           |
| Toggle state survives a full page reload | switch | toggle persists in /api/profile/me on refresh                                         | aria-checked still flipped after reload      | reverts to default |
| `[data-mol-id="settings-export"]`        | button | GET /api/clips → triggers JSON blob download                                          | download event fires                         | no download        |
| `[data-mol-id="settings-wipe"]`          | button | clears mol-cache:* localStorage entries                                               | mol-cache:* keys removed                     | keys remain        |
| Keyboard shortcuts table — 8 rows        | table  | static reference (Open palette, Navigate, Paste, Pin, Encrypt, Delete, Filter, Close) | all 8 visible                                | any missing        |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected                  |
| ------------ | ------ | --------------- | ------------------------------------------------------- |
| initial load | GET    | /api/profile/me | 200 with toggles + planKey                              |
| toggle       | PATCH  | /api/profile/me | `{toggles: {key: bool}}` → 200                          |
| export       | GET    | /api/clips      | 200 with array of clip rows (used to build a JSON blob) |

## Coverage check (final pass)

- [x] Plan summary observed in default Free state
- [x] All 5 toggles documented; one tested for PATCH persistence
- [x] Toggle survives reload (re-fetch persistence)
- [x] Export action triggers GET /api/clips + feedback
- [x] Wipe action clears the right localStorage prefixes only
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
