# Page observations: /profile (Profile)

Source: live walk via Playwright + e2e/profile.spec.ts. Reads
/api/profile/me + /api/devices on first paint. Form lets the user
update name + email; saves via PATCH /api/profile/me. Active sessions
table shows every device with revoke-on-non-current.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                            | role    | expected behavior on interaction               | success signal                              | failure signal |
| ----------------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------- | -------------- |
| `[data-mol-id="profile-name"]` + `profile-email`      | text    | renders user's name + email after first paint  | both visible                                | missing        |
| Initial fetch GET /api/profile/me + GET /api/devices  | network | both fire on first paint                       | both 200 in network capture                 | missing fetch  |
| `input#profile-name-input` + `Save changes` submit    | form    | PATCH /api/profile/me persists new name        | feedback visible + GET /me returns new name | no persistence |
| `input#profile-email-input` + `Save changes` submit   | form    | PATCH /api/profile/me persists new email       | GET /me returns new email                   | no persistence |
| `[data-mol-id="profile-avatar"]`                      | text    | renders initials from name (or email fallback) | first 1-2 chars visible                     | empty / `?`    |
| `[data-mol-id="sessions-list"]` row + `Current` badge | table   | one row per device with current session marked | current row badged, others not              | wrong/missing  |

## Network calls expected during normal use

| trigger      | method | path             | what request body or query is expected                |
| ------------ | ------ | ---------------- | ----------------------------------------------------- |
| initial load | GET    | /api/profile/me  | 200 with `{id, email, name, planKey, theme, toggles}` |
| initial load | GET    | /api/devices     | 200 with array of device rows                         |
| save form    | PATCH  | /api/profile/me  | `{name, email}` → 200                                 |
| revoke       | DELETE | /api/devices/:id | → 204                                                 |

## Coverage check (final pass)

- [x] Navigated, snapshotted, listed, then re-navigated
- [x] Both editable inputs documented + tested for persistence
- [x] Avatar initials behaviour tested
- [x] Sessions table presence tested
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
