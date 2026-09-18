# Page observations: /floorplan (Floorplan)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role    | expected behavior on interaction                  | success signal           | failure signal      |
| ------------------------------- | ------- | ------------------------------------------------- | ------------------------ | ------------------- |
| `getByRole('heading').first()`  | heading | floorplan page renders                            | heading visible          | blank               |
| rooms placement region          | region  | shows the rooms (or empty state) on the floorplan | region visible           | blank               |
| navigate-back link to /overview | link    | returns to /overview                              | URL contains `/overview` | stays on /floorplan |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/floorplan.spec.ts`
