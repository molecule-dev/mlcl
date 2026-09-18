# Page observations: /favorites (Favorites)

> Authed — the photos this user has favorited. Each card links to the
> photo detail. Empty state for users without favorites yet.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal               | failure signal |
| -------------------------- | ------- | -------------------------------- | ---------------------------- | -------------- |
| Favorites heading          | heading | identifies the page              | heading visible              | empty page     |
| Favorited photo card       | link    | nav to `/photos/:id`             | URL becomes `/photos/<id>`   | stays          |
| Photo image                | img     | renders real bytes               | `naturalWidth>0`             | broken image   |
| Empty state copy           | text    | shown when no favorites          | text visible for new account | not displayed  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger    | method | path                  | what request body or query is expected |
| ---------- | ------ | --------------------- | -------------------------------------- |
| Page mount | GET    | /api/photos/favorites | `[{ id, title, original_url, ... }]`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/favorites.spec.ts`
