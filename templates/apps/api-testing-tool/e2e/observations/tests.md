# Page observations: /tests (TestRunner)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role                  | expected behavior on interaction                                                  | success signal                                                                                       | failure signal                                            |
| ------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `getByRole('heading', { name: /^Test runner$/i, level: 1 })` | heading               | renders page heading after auth bootstrap                                         | heading visible                                                                                      | redirect to /login                                        |
| `[data-mol-id="testrunner-new"]`                             | button                | POST `/api/tests` then refresh list — appends a new test row in the suites column | a POST to `/api/tests` is observed AND the suites list grows by one                                  | no network call or count unchanged                        |
| `[data-mol-id="testrunner-run-all"]`                         | button                | POST `/api/tests/:id/run` for every test in the list, then refresh                | a POST to `/api/tests/.+/run` is observed AND last_status flips to `passed`/`failed`                 | nothing fires (button disabled when there are zero tests) |
| `[data-mol-id^="testrunner-suite-"]`                         | button (sidebar item) | switching the active suite re-renders the assertions panel on the right           | the active suite ID flips and the heading on the right matches the selected suite name               | nothing changes                                           |
| `[data-mol-id^="testrunner-run-"]`                           | button                | POST `/api/tests/:id/run` for one test only and update its assertion table        | a POST to `/api/tests/.+/run` is observed AND the per-assertion StatusPills resolve to PASSED/FAILED | nothing fires                                             |
| `getByText(/No tests yet/i)`                                 | empty-state copy      | renders when the user has zero tests                                              | text visible on a fresh signup                                                                       | text missing while count == 0                             |

## Hidden surfaces opened from this page

| trigger                                 | what it opens                       | elements inside                                                                                         |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Selecting an item in the suites sidebar | the assertions panel for that suite | per-assertion `StatusPill` (`PASSED`, `FAILED`, or `SKIPPED`), assertion text `field operator expected` |

## Network calls expected during normal use

| trigger           | method | path               | what request body or query is expected                              |
| ----------------- | ------ | ------------------ | ------------------------------------------------------------------- |
| Page load         | GET    | /api/tests         | array of test rows                                                  |
| New test          | POST   | /api/tests         | `{ name, assertions: [{ field, operator, expected }] }`             |
| Run one / Run all | POST   | /api/tests/:id/run | empty body — server evaluates assertions against latest history row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tests.spec.ts`
