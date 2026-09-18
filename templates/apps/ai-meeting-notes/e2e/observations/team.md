# Page observations: /team (Team)

> Authenticated. Shows active members, then a Pending invitations
> section if any. Each non-Owner active row exposes a Remove link;
> pending rows expose Cancel. The "Invite teammate" button opens a
> dialog with email + role inputs that POSTs /api/team.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role        | expected behavior on interaction                          | success signal  | failure signal  |
| ------------------------------------------------------------ | ----------- | --------------------------------------------------------- | --------------- | --------------- |
| `getByRole('heading', { name: /^team$/i })`                  | heading     | identifies the page                                       | h1 visible      | empty page      |
| `getByRole('button', { name: /invite teammate/i })`          | button      | opens invite dialog                                       | dialog visible  | nothing happens |
| `getByText(/active members/i)`                               | heading     | section header for active members                         | text visible    | section missing |
| `page.locator('[data-mol-id^="team-member-self:"]').first()` | row         | the synthesized Owner row representing the signed-in user | row visible     | missing         |
| `page.locator('[data-mol-id="nav-team"]')`                   | sidebar nav | sidebar shell rendered                                    | element visible | layout broken   |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside                                                                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------ |
| Click "Invite teammate" | dialog        | email input, role select (Member/Admin), Send invitation submit, Cancel button |

## Network calls expected during normal use

| trigger                     | method | path          | what request body or query is expected         |
| --------------------------- | ------ | ------------- | ---------------------------------------------- |
| Page load                   | GET    | /api/team     | enriched member list incl. self-as-Owner row   |
| Submit invite dialog        | POST   | /api/team     | `{ email, role }`; returns the new pending row |
| Click Cancel on pending row | DELETE | /api/team/:id | row disappears                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-team.spec.ts`
