# Page observations: /issues

> Authenticated issues list. Each row is a link to /issues/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction            | success signal                     | failure signal           |
| -------------------------------------- | ------- | ------------------------------------------- | ---------------------------------- | ------------------------ |
| Issue rows linked to /issues/:id       | link    | click navigates to /issues/:id              | URL matches /issues/[uuid]         | stays on /issues         |
| Body text contains seeded issue titles | text    | titles render                               | first 3 seeded titles in innerText | list empty               |
| Search/filter `input[type="search"]`   | textbox | optional search input is visible if present | visible                            | missing (then test.skip) |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-issues.spec.ts
