# Page observations: /profile/:handle (Profile)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                               | success signal                              | failure signal  |
| ---------------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------- | --------------- |
| Display name + handle                                | heading | render the profile owner's display name and `@handle`          | name + handle visible                       | header missing  |
| Stats row (Posts / Followers / Following)            | region  | reflect counts from `/api/profile/:handle`                     | numeric values render                       | counts missing  |
| `[data-testid="follow-toggle"]` (Follow / Following) | button  | POST/DELETE `/api/follows/users/:id`; flips label              | label switches between Follow and Following | revert on error |
| `[data-testid="message-author"]` (Message)           | button  | POST `/api/messages/threads { user_id }` then nav to /messages | URL becomes /messages                       | error toast     |
| Posts grid `a[href="/posts/:id"]`                    | link    | navigate to that post's detail page                            | URL becomes /posts/:id                      | nav fails       |

## Hidden surfaces opened from this page

| trigger              | what it opens         | elements inside (selector / role / behavior) |
| -------------------- | --------------------- | -------------------------------------------- |
| Share profile button | clipboard / web share | clipboard write or native share sheet        |

## Network calls expected during normal use

| trigger        | method | path                   | what request body or query is expected        |
| -------------- | ------ | ---------------------- | --------------------------------------------- |
| Page mount     | GET    | /api/profile/:handle   | returns profile with counts + `is_following`  |
| Page mount     | GET    | /api/posts?user_id=    | returns the owner's posts                     |
| Follow click   | POST   | /api/follows/users/:id | returns `{ following: true }`                 |
| Unfollow click | DELETE | /api/follows/users/:id | returns `{ following: false }`                |
| Message click  | POST   | /api/messages/threads  | `{ user_id }` returns `{ id }` for the thread |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile__handle.spec.ts`
