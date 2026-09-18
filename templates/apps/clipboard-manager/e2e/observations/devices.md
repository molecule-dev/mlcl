# Page observations: /devices (Devices)

Source: live walk via Playwright + e2e/devices.spec.ts. Lists every
session via /api/devices. Marks the current session with a
"This device" badge. Sign-out button on every NON-current row revokes
the session via DELETE /api/devices/:id.

## Page state assumed

- [x] Authenticated (signup spawns the first device row)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                  | success signal                                | failure signal    |
| ---------------------------------------------------- | ------- | ------------------------------------------------- | --------------------------------------------- | ----------------- |
| Current device row + `This device` badge             | text    | first device created on signup, marked as current | badge visible exactly once                    | wrong/missing     |
| Initial fetch GET /api/devices                       | network | fires on first paint                              | 200 in network capture                        | no fetch          |
| `[data-mol-id="devices-summary"]`                    | text    | shows active device count from API                | contains numeric count                        | mismatch          |
| Current row hides `Sign out` button                  | button  | only non-current rows expose revoke               | 0 sign-out buttons on current row             | unexpected button |
| Non-current row `Sign out` (DELETE /api/devices/:id) | button  | revokes session via API                           | row absent from /api/devices list after click | row remains       |

## Network calls expected during normal use

| trigger      | method | path             | what request body or query is expected |
| ------------ | ------ | ---------------- | -------------------------------------- |
| initial load | GET    | /api/devices     | 200 with array of device rows          |
| revoke       | DELETE | /api/devices/:id | → 204                                  |

## Coverage check (final pass)

- [x] Navigated, snapshotted, listed, then re-navigated
- [x] Current row + badge documented (no Sign-out button)
- [x] Multi-device revoke flow tested (skips if POST /devices unavailable)
- [x] All elements above have a corresponding test in `e2e/devices.spec.ts`
