# Page observations: /team

> Authenticated team list. Invite dialog posts to /api/team/invite.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role            | expected behavior on interaction                    | success signal                         | failure signal       |
| -------------------------- | --------------- | --------------------------------------------------- | -------------------------------------- | -------------------- |
| Member rows from /api/team | list            | renders 4 seeded team members                       | member names visible                   | empty                |
| "Invite teammate" button   | button          | opens invite dialog + submits POST /api/team/invite | invite appears under "Pending invites" | stays / dialog stuck |
| Invite email field         | textbox (email) | accepts the invitee email                           | value reflected                        | rejected             |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside                    |
| ----------------------- | ------------- | ---------------------------------- |
| Click "Invite teammate" | invite dialog | email field + role select + submit |

## Network calls expected during normal use

| trigger       | method | path             | expected body   |
| ------------- | ------ | ---------------- | --------------- |
| Submit invite | POST   | /api/team/invite | { email, role } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-team.spec.ts
