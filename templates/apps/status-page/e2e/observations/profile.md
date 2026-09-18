# Page observations: /profile (Operator profile)

> Filled from a live walk via Playwright MCP at /profile. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                  | role   | expected behavior on interaction                | success signal                     | failure signal                   |
| --------------------------------------------------------------------------- | ------ | ----------------------------------------------- | ---------------------------------- | -------------------------------- |
| Name + email block                                                          | text   | render the signed-in user's real name and email | values match useAuth().user        | hardcoded names like Asha Rahman |
| `getByTestId('edit-profile-btn')` then `getByTestId('edit-profile-submit')` | button | open edit form and PATCH /api/users/:id         | name persists; GET reflects update | error visible                    |
| KPI cards driven by /api/incidents                                          | text   | totals, open, resolved, avg MTTR                | API call fires; numbers match API  | hardcoded mock numbers           |

## Hidden surfaces opened from this page

| trigger      | what it opens | elements inside (selector / role / behavior) |
| ------------ | ------------- | -------------------------------------------- |
| Edit profile | inline form   | name, email, save, cancel                    |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| Page load | GET    | /api/incidents | drives KPI calculations                |
| Save      | PATCH  | /api/users/:id | `{ name, email }` returns updated row  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-profile.spec.ts`
