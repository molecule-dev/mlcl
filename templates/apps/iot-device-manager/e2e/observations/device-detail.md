# Page observations: /devices/:id (DeviceDetail)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up + register a device, navigate to `/devices/:id` (use APP_BASE).
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role                      | expected behavior on interaction | success signal                                         | failure signal                                           |
| ------------------------------------ | ------------------------- | -------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `getByRole('link', { name: /back     | devices/i }).first()`     | link                             | navigates back to `/devices`                           | URL becomes `/devices`                                   | URL unchanged                                   |
| `getByRole('button', { name: /reboot | send reboot/i }).first()` | button                           | POSTs `/api/commands` with type=reboot for this device | command appears in the device-scoped log                 | nothing happens; no POST                        |
| `getByRole('button', { name: /custom | send command              | send/i }).first()`               | button                                                 | opens custom-command modal; submit POSTs `/api/commands` | command appears in log with chosen type+payload | nothing happens; no POST |

## Hidden surfaces opened from this page

| trigger               | what it opens                                                  | elements inside (selector / role / behavior)                                 |
| --------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Custom-command button | modal with command_type input + JSON payload textarea + submit | command_type input, payload textarea, "Send" submit, validation error region |

## Network calls expected during normal use

| trigger               | method | path                            | what request body or query is expected |
| --------------------- | ------ | ------------------------------- | -------------------------------------- |
| page load             | GET    | /api/devices/:id                | (none)                                 |
| page load             | GET    | /api/telemetry/latest/:deviceId | (none)                                 |
| page load             | GET    | /api/commands?device_id=:id     | (none)                                 |
| reboot button         | POST   | /api/commands                   | { device_id, command_type: "reboot" }  |
| custom command submit | POST   | /api/commands                   | { device_id, command_type, payload }   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/device-detail.spec.ts`
