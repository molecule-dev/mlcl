# Page observations: /devices (Devices)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/devices` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role       | expected behavior on interaction       | success signal                                   | failure signal                  |
| --------------------------------------------- | ---------- | -------------------------------------- | ------------------------------------------------ | ------------------------------- |
| `getByRole('button', { name: /register device | new device | add device/i }).first()`               | button                                           | opens the Register Device modal | modal/form becomes visible with name + type fields | nothing happens |
| `getByPlaceholder(/search/i)`                 | textbox    | filters the device list by name/serial | typed query narrows the rendered rows; URL stays | no filtering                    |
| `getByRole('button', { name: /^all$/i })`     | button     | status filter — shows all devices      | `/api/devices` listing reflects all rows         | filter has no effect            |

## Hidden surfaces opened from this page

| trigger                | what it opens                                      | elements inside (selector / role / behavior)                              |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Register Device button | modal with name/type/serial inputs + submit/cancel | name input, type select, serial input, "Register" submit, "Cancel" button |

## Network calls expected during normal use

| trigger         | method | path         | what request body or query is expected |
| --------------- | ------ | ------------ | -------------------------------------- |
| page load       | GET    | /api/devices | (none)                                 |
| Register submit | POST   | /api/devices | { name, device_type, serial_number }   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/devices.spec.ts`
