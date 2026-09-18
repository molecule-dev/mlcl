# Page observations: /devices/:id (DeviceDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                         | success signal                            | failure signal  |
| ------------------------------ | ------- | -------------------------------------------------------- | ----------------------------------------- | --------------- |
| `getByRole('heading').first()` | heading | shows the seeded device name                             | heading matches                           | blank           |
| toggle button                  | button  | POST /api/iot-devices/:id/toggle and flips backend state | state property flipped via subsequent GET | state unchanged |
| back link                      | link    | returns to /overview or /rooms list                      | URL leaves /devices/:id                   | stays on detail |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected |
| ------------ | ------ | --------------------------- | -------------------------------------- |
| page mount   | GET    | /api/iot-devices/:id        | (no body)                              |
| click toggle | POST   | /api/iot-devices/:id/toggle | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/devices__id.spec.ts`
