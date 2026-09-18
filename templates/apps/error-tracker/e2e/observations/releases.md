# Page observations: /releases

> Authenticated releases list. Each row → /releases/:version. New release POSTs to /api/releases.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role   | expected behavior on interaction                                    | success signal              | failure signal |
| -------------------------------- | ------ | ------------------------------------------------------------------- | --------------------------- | -------------- |
| Release rows from /api/releases  | list   | renders 4 seeded releases                                           | versions visible            | empty          |
| Release row → /releases/:version | link   | navigates to release detail with version + commits                  | detail page renders version | stays          |
| Log a deploy form/button         | button | POST /api/releases creates a new release that's visible on next GET | new release in list         | absent         |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-releases.spec.ts
