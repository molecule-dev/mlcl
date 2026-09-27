# Page observations: /profile (Profile)

> Filled from a live walk via Playwright MCP at /profile. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role              | expected behavior on interaction                                | success signal                                | failure signal                    |
| -------------------------------------- | ----------------- | --------------------------------------------------------------- | --------------------------------------------- | --------------------------------- |
| `getByText(<userFirstName>)`           | text              | render user identity (name + email)                             | first name + email visible                    | identity missing                  |
| `getByRole('button', { name: /generate | create.*kit/i })` | button                                                          | POST /api/recovery-keys; reveal recovery code | recovery code visible after click | no API call / no code shown |
| `getByText(/recovery/i)` list          | list              | render existing recovery keys (GET /api/recovery-keys on mount) | list rendered (empty or with rows)            | no GET fired / blank panel        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path               | what request body or query is expected                                                    |
| ------------------ | ------ | ------------------ | ----------------------------------------------------------------------------------------- |
| page mount         | GET    | /api/recovery-keys | returns array of recovery keys for the user                                               |
| Generate kit click | POST   | /api/recovery-keys | `{ recovery_kit }` (plain text — an export/copy artifact, not crypto) returns `{ id, … }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
