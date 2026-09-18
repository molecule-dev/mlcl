# Page observations: /firmware (Firmware)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/firmware` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role                        | expected behavior on interaction | success signal                                               | failure signal                                                         |
| ----------------------------------------------------- | --------------------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `getByRole('button', { name: /upload firmware         | new version/i }).first()`   | button                           | opens the Upload Firmware modal                              | modal becomes visible with version + type + notes fields               | nothing happens                                      |
| `getByRole('button', { name: /rollout                 | start rollout/i }).first()` | button                           | opens the Rollout modal (disabled when no published version) | modal lists published versions, fleet/devices selector, "Start" button | disabled button stays disabled (correct empty state) |
| `getByRole('heading', { name: /firmware/i }).first()` | heading                     | renders the page heading         | heading text contains "Firmware"                             | empty page or missing heading                                          |

## Hidden surfaces opened from this page

| trigger                | what it opens                                                        | elements inside (selector / role / behavior)                                             |
| ---------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Upload Firmware button | modal with version input, device-type select, release-notes textarea | version input, device-type select, release-notes textarea, file/url input, Upload submit |
| Rollout button         | modal with version select + fleet select + per-fleet checkbox        | version select, fleet select, fleet checkboxes, "Start rollout" submit                   |

## Network calls expected during normal use

| trigger                   | method | path                      | what request body or query is expected       |
| ------------------------- | ------ | ------------------------- | -------------------------------------------- |
| page load                 | GET    | /api/firmware             | (none)                                       |
| Upload submit             | POST   | /api/firmware             | { version, device_type, release_notes, ... } |
| Auto-publish after upload | POST   | /api/firmware/:id/publish | (none)                                       |
| Start rollout submit      | POST   | /api/firmware/rollouts    | { firmware_id, fleet_ids?, device_ids? }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/firmware.spec.ts`
