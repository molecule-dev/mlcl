# Page observations: /forgot-password (ForgotPassword)

> Filled from a live walk via Playwright MCP at /forgot-password. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role         | expected behavior on interaction | success signal                                          | failure signal                       |
| ------------------------------------------- | ------------ | -------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `input[type=email]`                         | textbox      | accept email value               | value typed                                             | input rejects                        |
| `getByRole('button', { name: /send          | reset/i })`  | button                           | POST /api/users/forgot-password; show submitted heading | submitted heading visible after POST | no API call / no heading |
| `getByRole('link', { name: /back to sign in | log in/i })` | link                             | navigate to /login                                      | URL becomes /login                   | nav fails                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                       | what request body or query is expected       |
| ---------- | ------ | -------------------------- | -------------------------------------------- |
| Send click | POST   | /api/users/forgot-password | `{ email }` returns 200 (mailgun call fires) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
