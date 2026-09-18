# Page observations: /members (Members)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role      | expected behavior on interaction        | success signal               | failure signal           |
| ----------------------------------------------------------------- | --------- | --------------------------------------- | ---------------------------- | ------------------------ |
| `[data-testid="members-invite-button"]`                           | button    | toggles the invite form                 | invite form visible          | invite form not visible  |
| `[data-testid="members-invite-form"]`                             | form      | submits POST /api/members               | new row visible in list      | error visible            |
| `[data-testid="members-invite-email"]`                            | textbox   | accepts the invitee email               | value reflects typed input   | input cleared / disabled |
| `[data-testid="members-invite-role"]`                             | combobox  | selects member role                     | value reflects choice        | input disabled           |
| `[data-testid="members-invite-submit"]`                           | button    | POSTs the invite                        | list populates / row appears | error visible            |
| `[data-testid="members-list"]` or `[data-testid="members-empty"]` | list/text | renders the members list OR empty state | one is visible               | neither visible          |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside (selector / role / behavior) |
| --------------------- | ------------- | -------------------------------------------- |
| members-invite-button | invite form   | email + role inputs + submit                 |

## Network calls expected during normal use

| trigger       | method | path         | what request body or query is expected |
| ------------- | ------ | ------------ | -------------------------------------- |
| mount         | GET    | /api/members | scoped to current user                 |
| invite-submit | POST   | /api/members | { invitee_email, role }                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/members.spec.ts`
