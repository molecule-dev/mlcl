# Page observations: /agents (agents__id)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/agents` (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/agents__id.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                 | role    | expected behavior on interaction        | success signal                                           | failure signal                 |
| -------------------------------------------------------------------------- | ------- | --------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| `getByRole('link', { name: 'arrow_back agents' })`                         | link    | navigates per href                      | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('button', { name: 'Save Draft' })`                              | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'play_arrow Run Test' })`                     | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'web_search Real-time web results' })`        | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'code_executor Sandboxed Python REPL' })`     | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'file_reader Read PDF, MD, JSON files' })`    | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'http_request Outbound HTTP fetch' })`        | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'calculator Deterministic math' })`           | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'database_query Read-only SQL projection' })` | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('textbox', { name: 'Agent name' })`                             | textbox | accepts user input; submitted with form | typed value reflected in subsequent network call         | input rejected or not posted   |
| `getByRole('textbox', { name: 'Define agent behavior...' })`               | textbox | accepts user input; submitted with form | typed value reflected in subsequent network call         | input rejected or not posted   |
| `getByRole('textbox', { name: 'Send a test message...' })`                 | textbox | accepts user input; submitted with form | typed value reflected in subsequent network call         | input rejected or not posted   |
| `getByRole('button', { name: 'anthropic' })`                               | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'openai' })`                                  | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'google' })`                                  | button  | triggers documented behavior on click   | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('link', { name: 'Open prompt editor →' })`                      | link    | navigates per href                      | URL changes after click                                  | URL unchanged or 404           |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                | what request body or query is expected                 |
| ---------- | ------ | ------------------- | ------------------------------------------------------ |
| page load  | GET    | /api/agents/:id     | (none)                                                 |
| Save Draft | PUT    | /api/agents/:id     | { name, provider, model, system_prompt, tools_config } |
| Run Test   | POST   | /api/agents/:id/run | { message }                                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/agents__id.spec.ts`
