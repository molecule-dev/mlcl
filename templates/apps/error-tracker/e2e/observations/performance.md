# Page observations: /performance

> Authenticated performance overview. Renders summary cards (p50/p95/throughput) + worst-transactions list.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction               | success signal         | failure signal |
| -------------------------------------------- | ------- | ---------------------------------------------- | ---------------------- | -------------- |
| Summary cards (p50, p95, throughput_per_min) | text    | render numbers from /api/performance.summary   | numeric values visible | NaN / empty    |
| Worst-transactions list                      | list    | non-empty when seed produced traffic           | ≥ 1 transaction row    | empty          |
| Page load fires GET /api/performance         | network | first request on page load is /api/performance | captured request 2xx   | no request     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger   | method | path             | expected body                                               |
| --------- | ------ | ---------------- | ----------------------------------------------------------- |
| Page load | GET    | /api/performance | { summary: { p50, p95, throughput_per_min }, worst: [...] } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-performance.spec.ts
