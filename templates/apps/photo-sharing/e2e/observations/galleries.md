# Page observations: /galleries (Galleries)

> Authed — editor-curated public-album-as-galleries view. Featured
> gallery hero card on top, three sample-style cards below. Each card
> linked to its underlying `/albums/:id` page (via the data-testid
> `galleries-card-<albumId>`). Live data comes from
> `GET /api/galleries`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role    | expected behavior on interaction | success signal             | failure signal |
| ----------------------------------------- | ------- | -------------------------------- | -------------------------- | -------------- |
| Galleries heading                         | heading | identifies the page              | heading visible            | empty page     |
| `[data-testid^="galleries-card-"]`        | link    | nav to /albums/:id               | URL becomes `/albums/<id>` | wrong target   |
| `[data-testid="galleries-featured-open"]` | link    | nav to the featured album        | URL becomes `/albums/<id>` | stays          |
| Cover photo image                         | img     | renders                          | image visible              | broken image   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected        |
| ---------- | ------ | -------------- | --------------------------------------------- |
| Page mount | GET    | /api/galleries | `{ data: [{ id, title, photo_count, ... }] }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/galleries.spec.ts`
