# Page observations: /alerts (Alerts)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~7 alerts (5 unresolved, 2 resolved).

## Elements

| selector / accessible name                                         | role          | expected behavior on interaction                                            | success signal                                            | failure signal                    |
| ------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| `getByRole('heading', { name: /^alerts$/i, level: 1 })`            | heading       | page heading                                                                | heading visible                                           | shell error                       |
| `getByText(/\\d+ of \\d+ alerts/i)`                                | text          | subheader shows visible/total counts derived from current filter            | text matches "5 of 7 alerts" by default                   | "0 of 0 alerts" or absent         |
| `getByRole('navigation', { name: /filter alerts/i })`              | navigation    | wraps filter chips                                                          | landmark present                                          | missing                           |
| `getByRole('button', { name: /^unresolved$/i, pressed: true })`    | toggle button | default filter — shows alerts where `resolved === false`                    | aria-pressed=true on load; only unresolved cards rendered | rendered but pressed=false        |
| `getByRole('button', { name: /^high$/i })`                         | toggle button | filter to `severity === 'high'`                                             | only high-severity cards remain                           | unchanged                         |
| `getByRole('button', { name: /^all$/i })`                          | toggle button | show all alerts                                                             | counts equal                                              | filtered                          |
| `getByRole('button', { name: /^resolved$/i })`                     | toggle button | show only `resolved === true`                                               | resolved cards rendered with `opacity-60`                 | empty                             |
| First alert card (`getByRole('article').first()`)                  | article       | shows severity icon + plate + driver + severity chip + timestamp + message  | card visible with all parts                               | "Failed to load alerts."          |
| `getByRole('link', { name: /^[A-Z0-9-]+$/ }).first()` (plate link) | link          | navigate to `/vehicles/<vehicle_id>`                                        | URL changes to vehicles/UUID                              | stays                             |
| `getByRole('button', { name: /^acknowledge$/i }).first()`          | button        | POST `/api/alerts/<id>/acknowledge`, optimistic `resolved=true`, card fades | acknowledge button hidden, card opacity reduced           | error toast / button still active |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside (selector / role / behavior) |
| ----------------------- | ------------- | -------------------------------------------- |
| (none — flat list page) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger                      | method | path                        | what request body or query is expected              |
| ---------------------------- | ------ | --------------------------- | --------------------------------------------------- |
| Initial mount                | GET    | /api/alerts                 | full alert list, owner-scoped                       |
| Click "Acknowledge" on a row | POST   | /api/alerts/:id/acknowledge | `{}` (empty body); response toggles `resolved=true` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
