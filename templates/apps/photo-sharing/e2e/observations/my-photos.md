# Page observations: /my-photos (MyPhotos)

> Authed — the signed-in user's own photos. Each card links to
> `/photos/:id`. Empty state for new accounts. "Upload" CTA links
> to `/upload`. Real images render via `/api/photo-files/:storageKey`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal             | failure signal |
| -------------------------- | ------- | -------------------------------- | -------------------------- | -------------- |
| Upload link                | link    | nav to /upload                   | URL becomes `/upload`      | stays          |
| Photo card                 | link    | nav to `/photos/:id`             | URL becomes `/photos/<id>` | stays          |
| Photo image                | img     | renders real bytes (proxied S3)  | `naturalWidth>0`           | broken image   |
| Heading                    | heading | identifies the page              | heading visible            | empty page     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path                         | what request body or query is expected |
| ------------ | ------ | ---------------------------- | -------------------------------------- |
| Page mount   | GET    | /api/photos?owner=me         | `[{ id, title, original_url, ... }]`   |
| Image render | GET    | /api/photo-files/:storageKey | binary bytes                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/my-photos.spec.ts`
