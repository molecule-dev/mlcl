# Page observations: /actions (Action items)

> Authenticated. Aggregates action items across every meeting. Has
> All / Open / In progress / Done filter pills. Each row's status badge
> doubles as a button: clicking flips between open and done via PUT
> /api/action_items/:id and persists.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role        | expected behavior on interaction                       | success signal         | failure signal |
| ------------------------------------------------- | ----------- | ------------------------------------------------------ | ---------------------- | -------------- |
| `getByRole('heading', { name: /action items/i })` | heading     | identifies the page                                    | h1 visible             | empty page     |
| `getByRole('button', { name: /^all$/i })`         | button      | filter switches to all rows                            | filter pill active     | no change      |
| `getByRole('button', { name: /^open$/i })`        | button      | filter restricts to status=open                        | only open rows shown   | no change      |
| `getByRole('button', { name: /^done$/i })`        | button      | filter restricts to status=done                        | only done rows shown   | no change      |
| `getByRole('button', { name: /in progress/i })`   | button      | filter restricts to in_progress                        | only in_progress shown | no change      |
| `getByText(/no action items match/i)`             | empty state | shown when filter has zero results (also fresh signup) | text visible           | wrong content  |
| `page.locator('[data-mol-id="nav-actions"]')`     | sidebar nav | sidebar shell rendered                                 | element visible        | layout broken  |

## Hidden surfaces opened from this page

| trigger             | what it opens                    | elements inside                                        |
| ------------------- | -------------------------------- | ------------------------------------------------------ |
| Status badge button | toggles status open ⇄ done in DB | aria-pressed flips and PUT /api/action_items/:id fires |

## Network calls expected during normal use

| trigger            | method | path                  | what request body or query is expected                 |
| ------------------ | ------ | --------------------- | ------------------------------------------------------ |
| Page load          | GET    | /api/action_items     | enriched list with owner, owner_initial, meeting_title |
| Click status badge | PUT    | /api/action_items/:id | `{ status: 'done' \| 'open' }`                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-actions.spec.ts`
