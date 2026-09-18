# Page observations: /security (SecurityReport)

> Filled from a live walk via Playwright MCP at /security. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role          | expected behavior on interaction                | success signal                                 | failure signal                  |
| ------------------------------------------- | ------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| `getByText(/100                             | score/i)`     | text                                            | render security score (default 100)            | score visible                   | score missing |
| `getByRole('button', { name: /re-?scan      | refresh/i })` | button                                          | POST /api/security/refresh; recompute findings | POST fires + findings re-render | no API call   |
| `getByRole('button', { name: /dismiss/i })` | button        | PUT /api/security/findings/:id (dismissed=true) | finding marked dismissed in subsequent GET     | finding still active            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                   | what request body or query is expected                |
| ------------- | ------ | ---------------------- | ----------------------------------------------------- |
| page mount    | GET    | /api/security/findings | returns array of active security findings             |
| Re-scan click | POST   | /api/security/refresh  | recomputes findings server-side; returns updated list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
