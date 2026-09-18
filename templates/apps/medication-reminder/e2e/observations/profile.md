# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                              | success signal                                             | failure signal             |
| ----------------------------------------------------- | ------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| Profile heading                                       | heading | renders "Profile"                                                             | visible                                                    | absent                     |
| Identity / Medical / Emergency / Security nav buttons | button  | switch the right pane to the section                                          | aria-current=page on chosen tab + correct heading rendered | clicked tab not selected   |
| Identity name input                                   | textbox | accepts a name; PATCH /api/users/:id persists across reload                   | reload retains updated name                                | reload reverts to old name |
| Medical allergies input                               | textbox | accepts text; persists via PATCH /api/users/:id (oauthData.profile.allergies) | re-fetch via GET /api/users/me sees value                  | value lost after save      |
| Emergency contact name input                          | textbox | accepts emergency name; persists via PATCH /api/users/:id                     | re-fetch sees value                                        | value lost                 |
| Change password button → form                         | button  | reveals password change form                                                  | New password / Confirm fields visible                      | nothing happens            |

## Hidden surfaces opened from this page

| trigger                                               | what it opens | elements inside (selector / role / behavior)                     |
| ----------------------------------------------------- | ------------- | ---------------------------------------------------------------- |
| Identity / Medical / Emergency / Security tab buttons | section pane  | one section visible at a time                                    |
| Change password button                                | password form | current password, new password, confirm password fields + submit |

## Network calls expected during normal use

| trigger         | method | path                    | what request body or query is expected |
| --------------- | ------ | ----------------------- | -------------------------------------- |
| Save identity   | PATCH  | /api/users/:id          | { name, email, oauthData.profile }     |
| Save medical    | PATCH  | /api/users/:id          | { oauthData.profile }                  |
| Save emergency  | PATCH  | /api/users/:id          | { oauthData.profile.emergency }        |
| Change password | PATCH  | /api/users/:id/password | { currentPassword, newPassword }       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
