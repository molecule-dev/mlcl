# Page observations: /activity (Activity)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role     | expected behavior on interaction                   | success signal                            | failure signal     |
| ------------------------------- | -------- | -------------------------------------------------- | ----------------------------------------- | ------------------ |
| `getByRole('heading').first()`  | heading  | activity page renders empty state for a fresh user | heading visible, empty-state copy visible | blank              |
| event row (after device toggle) | listitem | shows logged events after a device toggle          | event row appears                         | list still empty   |
| navigate-back link to /overview | link     | returns to /overview                               | URL contains `/overview`                  | stays on /activity |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger    | method | path          | what request body or query is expected |
| ---------- | ------ | ------------- | -------------------------------------- |
| page mount | GET    | /api/activity | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/activity.spec.ts`
