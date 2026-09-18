# Page observations: /profile (Profile)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                   | role       | expected behavior on interaction                                                  | success signal                                                          | failure signal                                  |
| ---------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| `page.locator('#profile-household-size')`                                    | spinbutton | household size input — must be > 0                                                | value reflects typed number; <= 0 shows error and blocks PATCH          | input accepts invalid values without warning    |
| `page.locator('#profile-goal-kwh')`                                          | spinbutton | monthly kWh goal input                                                            | value reflects typed number                                             | input rejects keystrokes                        |
| `page.locator('[data-mol-id="profile-form"] button[type="submit"]').first()` | button     | PATCH /api/me with householdSize + goalKwhPerMonth; success toast appears         | [data-mol-id=profile-saved] visible; reload retains new values          | no PATCH or no saved indicator                  |
| `page.locator('[data-mol-id="profile-error"]')`                              | alert      | shows on invalid household size; PATCH not sent; identity (email) appears in hero | error visible after submitting 0; no PATCH /api/me; main contains email | silent submit on invalid input or email missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger      | method | path    | what request body or query is expected                              |
| ------------ | ------ | ------- | ------------------------------------------------------------------- |
| initial load | GET    | /api/me | returns `{ id, email, householdSize, goalKwhPerMonth, notify* }`    |
| save (valid) | PATCH  | /api/me | `{ householdSize, goalKwhPerMonth }` → 200; reload shows new values |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
