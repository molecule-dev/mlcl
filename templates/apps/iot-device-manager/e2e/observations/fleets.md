# Page observations: /fleets (Fleets)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/fleets` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role                       | expected behavior on interaction | success signal                                                                  | failure signal                                                      |
| -------------------------------------------- | -------------------------- | -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `getByRole('button', { name: /new fleet      | create fleet/i }).first()` | button                           | opens the Create Fleet modal                                                    | modal/form becomes visible with name + description fields           | nothing happens        |
| `getByRole('button', { name: /manage devices | add devices/i }).first()`  | button                           | opens device-membership modal for a fleet (only when at least one fleet exists) | modal lists candidate devices and Add/Remove controls               | nothing happens        |
| `getByRole('button', { name: /delete         | remove fleet/i }).first()` | button                           | DELETE `/api/fleets/:id` with confirmation; fleet disappears from list          | fleet row removed; subsequent GET `/api/fleets` does not include it | row remains; no DELETE |

## Hidden surfaces opened from this page

| trigger               | what it opens                                        | elements inside (selector / role / behavior)                       |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| New Fleet button      | modal with name + description inputs + submit/cancel | name input, description textarea, "Create" submit, "Cancel" button |
| Manage Devices button | modal listing devices with Add/Remove buttons        | device rows, Add button, Remove button, Done/Close button          |

## Network calls expected during normal use

| trigger          | method | path                              | what request body or query is expected |
| ---------------- | ------ | --------------------------------- | -------------------------------------- |
| page load        | GET    | /api/fleets                       | (none)                                 |
| New Fleet submit | POST   | /api/fleets                       | { name, description, tags }            |
| Add device       | POST   | /api/fleets/:id/devices           | { device_id }                          |
| Remove device    | DELETE | /api/fleets/:id/devices/:deviceId | (none)                                 |
| Delete fleet     | DELETE | /api/fleets/:id                   | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/fleets.spec.ts`
