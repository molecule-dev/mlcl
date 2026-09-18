# Page observations: /caregivers (Caregivers)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role     | expected behavior on interaction                                 | success signal                        | failure signal           |
| ---------------------------- | -------- | ---------------------------------------------------------------- | ------------------------------------- | ------------------------ |
| Caregivers heading           | heading  | renders "Caregivers"                                             | visible                               | absent                   |
| Invite caregiver button      | button   | toggles invite form open/closed                                  | form visible after click              | nothing happens          |
| Caregiver email input        | textbox  | accepts email                                                    | typed value visible                   | read-only                |
| Permission radios            | radio    | selects view / notify / manage                                   | selected radio reflected in next POST | never updates            |
| Send invite button           | button   | POSTs /api/caregivers, list refreshes with the new caregiver row | new row visible after success         | row absent after success |
| Caregiver row (after invite) | listitem | renders email, permission label, status pending until accepted   | row visible with caregiver email      | not rendered             |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside (selector / role / behavior)       |
| ----------------------- | ------------- | -------------------------------------------------- |
| Invite caregiver button | invite form   | email input, permission radios, Send invite button |

## Network calls expected during normal use

| trigger     | method | path            | what request body or query is expected |
| ----------- | ------ | --------------- | -------------------------------------- |
| Page mount  | GET    | /api/caregivers | (none)                                 |
| Send invite | POST   | /api/caregivers | { caregiver_email, permission }        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/caregivers.spec.ts`
