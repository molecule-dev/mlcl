# Page observations: /rooms/:id (RoomDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role    | expected behavior on interaction     | success signal                  | failure signal       |
| ---------------------------------- | ------- | ------------------------------------ | ------------------------------- | -------------------- |
| `getByRole('heading').first()`     | heading | displays the room name               | heading matches the seeded room | blank                |
| devices in room list               | list    | shows devices belonging to that room | list contains the seeded device | empty when populated |
| `getByRole('link').first()` (back) | link    | returns to /rooms                    | URL contains `/rooms` (no id)   | stays on detail      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger    | method | path             | what request body or query is expected |
| ---------- | ------ | ---------------- | -------------------------------------- |
| page mount | GET    | /api/rooms/:id   | (no body)                              |
| page mount | GET    | /api/iot-devices | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/rooms__id.spec.ts`
