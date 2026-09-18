# Page observations: /u/:handle (Profile)

> Authed — public profile of any user, resolved by username OR by user
> uuid. Shows a `data-testid="profile-name"` heading + portfolio grid of
> the user's public photos. Unknown handles render
> `data-testid="profile-error"`. Backend `GET /api/profiles/:handle`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role    | expected behavior on interaction  | success signal               | failure signal     |
| ------------------------------- | ------- | --------------------------------- | ---------------------------- | ------------------ |
| `[data-testid="profile-name"]`  | heading | renders the user's display name   | heading visible              | empty page         |
| Photo card in portfolio grid    | link    | nav to `/photos/:id`              | URL becomes `/photos/<id>`   | stays              |
| Cover/profile image             | img     | renders                           | image visible                | broken             |
| `[data-testid="profile-error"]` | text    | shown only when handle is unknown | error visible for bad handle | wrong copy / blank |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                     | method | path                  | what request body or query is expected     |
| --------------------------- | ------ | --------------------- | ------------------------------------------ |
| Page mount (known handle)   | GET    | /api/profiles/:handle | `{ id, name, photo_count, photos: [...] }` |
| Page mount (unknown handle) | GET    | /api/profiles/:handle | 404                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/u__handle.spec.ts`
