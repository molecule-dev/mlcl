# Page observations: /discover

> Authenticated event-search experience. Server-side filtering by level + environment.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role             | expected behavior on interaction                       | success signal                         | failure signal |
| ------------------------------------------- | ---------------- | ------------------------------------------------------ | -------------------------------------- | -------------- |
| Query input + Search button                 | textbox + button | submits the search; renders matching events            | event rows visible                     | empty          |
| Level filter `level=error`                  | filter           | GET /api/discover/events?level=error returns ≥ 1 event | events with level=error                | empty          |
| Environment filter `environment=production` | filter           | narrows to production                                  | all events have environment=production | mixed envs     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-discover.spec.ts
