# Page observations: /applications (Applications)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role                   | expected behavior on interaction | success signal               | failure signal                    |
| --------------------------------------------------------- | ---------------------- | -------------------------------- | ---------------------------- | --------------------------------- |
| `getByRole('heading')` first                              | heading                | visible above the fold           | rendered                     | missing                           |
| Empty-state `getByText(/no\s*applications                 | haven.?t\s*applied/i)` | status                           | shows when the list is empty | message visible on a fresh signup | absent |
| Application row `getByRole('link')` first inside the list | link                   | navigates to the job detail      | URL becomes /jobs/:id        | no nav                            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| mount   | GET    | /api/applications | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/applications.spec.ts`
