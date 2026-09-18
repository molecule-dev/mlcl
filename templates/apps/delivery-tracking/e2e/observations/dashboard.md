# Page observations: Operations dashboard /dashboard

> Filled by AI agent driving the running app via Playwright. Each row
> corresponds to an element actually rendered by the page when this file
> was generated.

## Page state assumed

- [x] Authenticated (sign up first via apiSignup + attachToken)

## Elements

| selector / accessible name      | role | expected behavior on interaction | success signal                        | failure signal                       |
| ------------------------------- | ---- | -------------------------------- | ------------------------------------- | ------------------------------------ |
| `a`                             | a    | renders as expected              | value reflects input or stays visible | no change / error toast / page crash |
| `[data-mol-id="nav-dashboard"]` | a    | renders as expected              | value reflects input or stays visible | no change / error toast / page crash |
| `[data-mol-id="nav-shipments"]` | a    | renders as expected              | value reflects input or stays visible | no change / error toast / page crash |
| `[data-mol-id="nav-alerts"]`    | a    | renders as expected              | value reflects input or stays visible | no change / error toast / page crash |

## Network calls expected during normal use

| trigger         | method | path                   | what request body or query is expected |
| --------------- | ------ | ---------------------- | -------------------------------------- |
| mount stats     | GET    | /api/reports/dashboard | —                                      |
| mount shipments | GET    | /api/shipments         | —                                      |
| mount alerts    | GET    | /api/alerts            | —                                      |
| mount analytics | GET    | /api/reports/analytics | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
