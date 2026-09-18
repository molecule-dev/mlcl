# Page observations: /energy (Energy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role    | expected behavior on interaction                       | success signal              | failure signal            |
| ------------------------------------ | ------- | ------------------------------------------------------ | --------------------------- | ------------------------- |
| `getByRole('heading').first()`       | heading | energy page renders                                    | heading visible             | blank                     |
| totals tiles (today_kwh / month_kwh) | group   | shows zeroed totals for a fresh user                   | tiles visible with 0 values | page blank                |
| devices section                      | region  | shows "no active devices" empty state when none seeded | empty-state copy visible    | tries to render undefined |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger    | method | path                | what request body or query is expected |
| ---------- | ------ | ------------------- | -------------------------------------- |
| page mount | GET    | /api/energy/stats   | (no body)                              |
| page mount | GET    | /api/energy/current | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/energy.spec.ts`
