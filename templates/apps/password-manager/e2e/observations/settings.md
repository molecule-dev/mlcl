# Page observations: /settings (Settings)

> Filled from a live walk via Playwright MCP at /settings. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role           | expected behavior on interaction              | success signal                                               | failure signal                        |
| -------------------------------------------- | -------------- | --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `getByRole('tab'/'link', { name: /master     | password/i })` | tab                                           | reveal master-password panel (default)                       | panel visible                         | panel blank   |
| `getByRole('tab'/'link', { name: /two-factor | 2fa/i })`      | tab                                           | reveal 2FA panel; POST /api/two-factor/enroll button visible | 2FA panel + Enroll button visible     | panel missing |
| `getByRole('tab'/'link', { name: /sessions   | devices/i })`  | tab                                           | reveal sessions panel; GET /api/devices fires                | devices list (or empty state) visible | panel blank   |
| `getByRole('button', { name: /enroll/i })`   | button         | POST /api/two-factor/enroll; show secret + QR | secret string visible                                        | no API call / no secret               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                   | what request body or query is expected |
| -------------------- | ------ | ---------------------- | -------------------------------------- |
| 2FA Enroll click     | POST   | /api/two-factor/enroll | returns `{ secret, otpauthUri }`       |
| Sessions panel mount | GET    | /api/devices           | returns array of authenticated devices |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
