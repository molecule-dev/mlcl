# Page observations: /projects (Projects)

> Filled from a Playwright MCP walk of the live app. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                                             | success signal                          | failure signal                      |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------- |
| `getByRole('heading', { name: /^Projects$/ })`              | heading | page h1                                                                      | visible                                 | missing                             |
| `getByRole('button', { name: /new project/i })`             | button  | opens "New project" `role="dialog"` modal with name input                    | dialog visible, focus on name field     | nothing happens                     |
| filter chip `getByRole('button', { name: /^All$/ })`        | button  | filter set to All; shows every project                                       | URL stays, list renders all             | missing                             |
| filter chip `getByRole('button', { name: /^Pinned$/ })`     | button  | filter set to Pinned; only `is_pinned=true` projects rendered                | filter visually selected, list narrows  | filter doesn't apply                |
| filter chip `getByRole('button', { name: /^Recent$/ })`     | button  | filter set to Recent                                                         | filter visually selected                | unchanged                           |
| modal name field `input[required][placeholder*="Midnight"]` | textbox | required project-name input inside modal                                     | accepts text                            | missing                             |
| modal `getByRole('button', { name: /^Cancel$/ })`           | button  | closes modal                                                                 | dialog gone                             | dialog still visible                |
| modal `getByRole('button', { name: /create project/i })`    | button  | submits POST `/api/projects` 201, then navigates to `/projects/:id` (Editor) | URL `/projects/<uuid>`, project visible | stays on `/projects`, alert visible |
| empty-state copy                                            | text    | "No projects yet — create your first arrangement." when list is empty        | visible after fresh signup              | missing                             |
| project tile (after create)                                 | link    | `<Link>` to `/projects/:id` for each tile                                    | clicking → editor URL                   | broken link                         |
| anonymous `/projects`                                       | n/a     | AuthGuard redirect                                                           | URL becomes `/login`                    | renders anonymously                 |

## Hidden surfaces opened from this page

| trigger              | what it opens         | elements inside (selector / role / behavior)                              |
| -------------------- | --------------------- | ------------------------------------------------------------------------- |
| `New project` button | `role="dialog"` modal | required name input (autofocused), Cancel button, "Create project" submit |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected                              |
| ------------ | ------ | --------------- | ------------------------------------------------------------------- |
| initial load | GET    | `/api/projects` | list of own projects                                                |
| modal submit | POST   | `/api/projects` | `{ name, bpm: 120 }` → 201 with `{ id, name, bpm, time_signature }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (modal walked)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects.spec.ts`
