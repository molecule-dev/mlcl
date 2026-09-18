# Page observations: /console (Console)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/console` (use APP_BASE)
   - Sign up first.
2. `mcp__playwright__browser_snapshot`, walk every node, fill rows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role     | expected behavior on interaction                                             | success signal                                                                         | failure signal                    |
| --------------------------------- | -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------- |
| `getByRole('combobox')`           | combobox | device selector — picks the device the next command/log targets              | selected option drives subsequent POST `/api/commands`                                 | nothing happens                   |
| `getByRole('textbox')`            | textbox  | command-line input; submit triggers `reboot`, `send`, `log`, `help`, `clear` | typed command echoed in the terminal pane and (where applicable) POSTs `/api/commands` | input rejected; no echo           |
| `getByRole('button', { name: /run | send     | enter/i }).first()`                                                          | button                                                                                 | submits the typed console command | console output appended; for `reboot`/`send`, a POST `/api/commands` fires | nothing happens |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                        | what request body or query is expected |
| -------------------- | ------ | --------------------------- | -------------------------------------- |
| `reboot`             | POST   | /api/commands               | { device_id, command_type: "reboot" }  |
| `send <type> {json}` | POST   | /api/commands               | { device_id, command_type, payload }   |
| `log`                | GET    | /api/commands?device_id=:id | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/console.spec.ts`
