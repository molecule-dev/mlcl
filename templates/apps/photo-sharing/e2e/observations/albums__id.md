# Page observations: /albums/:id (AlbumDetail)

> Authed — single album detail. Shows the album metadata + a grid of its
> photos. "Add photos" CTA links to `/upload?album_id=<id>` so newly
> uploaded photos land in this album. Owner has a Delete button that
> DELETEs `/api/albums/:id`. UUID-shaped guards must 404 on bad ids.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role    | expected behavior on interaction | success signal                  | failure signal |
| ----------------------------------------- | ------- | -------------------------------- | ------------------------------- | -------------- |
| Back-to-albums link                       | link    | nav to /albums                   | URL becomes `/albums`           | stays          |
| `[data-testid="album-detail-add-photos"]` | link    | href is `/upload?album_id=<id>`  | href asserted                   | wrong href     |
| Delete album button                       | button  | DELETE /api/albums/:id           | nav back to /albums; album gone | error toast    |
| Photo card in album grid                  | link    | nav to `/photos/:id`             | URL becomes `/photos/<id>`      | stays          |
| Album title heading                       | heading | identifies the page              | heading visible                 | empty page     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| Page mount   | GET    | /api/albums/:id | `{ id, title, ..., photos: [...] }`    |
| Click Delete | DELETE | /api/albums/:id | 200/204; photos detach but persist     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/albums__id.spec.ts`
