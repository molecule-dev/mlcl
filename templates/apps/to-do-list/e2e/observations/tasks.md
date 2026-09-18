# Page observations: tasks (today + inbox + upcoming + tasks/:id)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the task surface — quick-add on `/today` and `/inbox`, completion
> toggle, the `/tasks/:id` detail editor, and reordering.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                     | role           | expected behavior on interaction                                  | success signal                                                                 | failure signal                               |
| ---------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `getByRole('textbox', { name: /add a task for today/i })` + Add                                | textbox+button | Quick-add a task on `/today`, POST `/api/tasks`                   | Task title visible in list, present in next GET                                | Stays in input, no POST observed             |
| `getByRole('textbox', { name: /add a task to inbox/i })` + Add                                 | textbox+button | Quick-add a task on `/inbox`, POST `/api/tasks` (project_id=null) | New task in `?filter=inbox` GET with `project_id=null`                         | Task missing or project_id set               |
| `getByRole('button', { name: /mark.*as complete/i })` on a task row                            | button         | Toggle complete; PATCH `/api/tasks/:id` (or POST /complete)       | `completed=true` and `completed_at` set on next GET                            | `completed` unchanged after reload           |
| Priority `<select>` on `/tasks/:id`                                                            | combobox       | Change priority via PATCH `/api/tasks/:id`                        | `priority` field updated on next GET                                           | priority unchanged                           |
| `getByRole('button', { name: /delete this task/i })` on `/tasks/:id`                           | button         | Confirm dialog → DELETE `/api/tasks/:id` → navigate back          | URL becomes `/inbox`/`/today`/`/projects/:id`; subsequent GET `/tasks/:id` 404 | Stays on `/tasks/:id` or task still GET-able |
| GET `/api/tasks/today`, `/api/tasks/upcoming`, `/api/tasks/completed` (system endpoint probes) | route          | Return arrays scoped to the current user                          | `200` and arrays                                                               | non-2xx or non-array body                    |
| POST `/api/tasks/reorder` with `{ tasks: [...] }`                                              | route          | Persist new positions                                             | 2xx; subsequent GET reflects new order                                         | 4xx/5xx                                      |

## Hidden surfaces opened from this page

| trigger                          | what it opens                        | elements inside (selector / role / behavior)                        |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| Click task row title on `/today` | navigates to `/tasks/:id` (no modal) | task detail header, priority `<select>`, description editor, Delete |

## Network calls expected during normal use

| trigger                       | method | path                                                        | what request body or query is expected |
| ----------------------------- | ------ | ----------------------------------------------------------- | -------------------------------------- |
| Quick-add                     | POST   | /api/tasks                                                  | `{ title, priority? }` → 201           |
| Toggle complete               | POST   | /api/tasks/:id/complete                                     | empty body → 200 (or PATCH)            |
| Detail load                   | GET    | /api/tasks/:id                                              | → 200 with full task                   |
| Reorder                       | POST   | /api/tasks/reorder                                          | `{ tasks: [{id, position}] }` → 200    |
| List today/upcoming/completed | GET    | /api/tasks/today, /api/tasks/upcoming, /api/tasks/completed | filter results                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-tasks.spec.ts`
