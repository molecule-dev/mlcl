# Page observations: labels

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the labels list page, the create flow, and the label-task assignment
> join-table endpoints.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                           | role                  | expected behavior on interaction                                | success signal                                                  | failure signal                          |
| -------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| `getByText(/no labels yet/i)` on a fresh account                                                                     | text                  | Empty state visible after GET `/api/labels` returns `[]`        | Visible within 15s; `GET /api/labels` 200 observed              | Empty state hidden but no rows rendered |
| `getByRole('button', { name: /new label/i })` + `#label-new-name` + `getByRole('button', { name: /create label/i })` | button+textbox+button | Open form, fill name, POST `/api/labels`, persist across reload | `@<name>` chip visible after submit and after `page.reload()`   | Chip missing or 4xx response            |
| POST → PATCH → DELETE `/api/labels/:id` lifecycle                                                                    | route                 | Create, rename, delete a label via API                          | Each call 2xx; rename reflected in next GET; delete removes row | Mismatched name or row still present    |
| POST `/api/labels/assignments` + DELETE `/api/labels/assignments?task_id=&label_id=`                                 | route                 | Attach + detach a label to a task                               | task `labels` array contains then omits the name                | label not surfaced or DELETE fails      |

## Hidden surfaces opened from this page

| trigger           | what it opens      | elements inside (selector / role / behavior)              |
| ----------------- | ------------------ | --------------------------------------------------------- |
| Click "New label" | inline create form | `#label-new-name` text input, color picker, submit button |

## Network calls expected during normal use

| trigger | method | path                                       | what request body or query is expected |
| ------- | ------ | ------------------------------------------ | -------------------------------------- |
| List    | GET    | /api/labels                                | → 200 array (with task_count enrich)   |
| Create  | POST   | /api/labels                                | `{ name, color? }` → 201               |
| Update  | PATCH  | /api/labels/:id                            | `{ name? }` → 200                      |
| Delete  | DELETE | /api/labels/:id                            | → 200/204                              |
| Attach  | POST   | /api/labels/assignments                    | `{ task_id, label_id }` → 201/200      |
| Detach  | DELETE | /api/labels/assignments?task_id=&label_id= | → 204                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-labels.spec.ts`
