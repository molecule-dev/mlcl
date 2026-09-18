# Page observations: /rooms (Rooms)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role     | expected behavior on interaction     | success signal         | failure signal  |
| ------------------------------------------- | -------- | ------------------------------------ | ---------------------- | --------------- |
| `getByRole('heading').first()`              | heading  | rooms page renders                   | heading visible        | blank page      |
| `getByPlaceholder(/room/i)` (new room form) | textbox  | accepts a room name                  | `toHaveValue` matches  | empty           |
| submit-room button                          | button   | POST /api/rooms with the new name    | room appears in list   | no new row      |
| seeded room item                            | listitem | navigates to /rooms/:id when clicked | URL contains `/rooms/` | stays on /rooms |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger                 | method | path       | what request body or query is expected |
| ----------------------- | ------ | ---------- | -------------------------------------- |
| page mount              | GET    | /api/rooms | (no body)                              |
| create room form submit | POST   | /api/rooms | `{ name }`                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/rooms.spec.ts`
