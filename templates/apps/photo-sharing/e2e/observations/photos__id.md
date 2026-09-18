# Page observations: /photos/:id (PhotoDetail)

> Authed — single-photo detail view. Renders the image (proxied via
> `/api/photo-files/:storageKey`), the EXIF panel (camera/lens/aperture/
> shutter/iso) when the owner allows it, the photographer credit, and
> action buttons: Favorite, Download, Delete (owner only). Comment thread
> is the bottom block. UUID-shaped guards must 404 on bad ids.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role   | expected behavior on interaction                    | success signal                            | failure signal              |
| -------------------------------------------------- | ------ | --------------------------------------------------- | ----------------------------------------- | --------------------------- |
| `[data-testid="photo-detail-image"]`               | img    | renders the photo with real bytes                   | `naturalWidth>0`                          | placeholder rendered        |
| Favorite button                                    | button | POST /api/photos/:id/favorite — toggles `favorited` | next GET shows new state                  | toast/no change             |
| `[data-testid="photo-detail-download"]`            | button | initiates the download                              | a Playwright `download` event fires       | no file                     |
| `[data-testid="photo-detail-delete"]` (owner only) | button | DELETE /api/photos/:id                              | redirect away; row gone on subsequent GET | 4xx/5xx                     |
| EXIF text "Camera body / aperture / shutter / iso" | text   | visible iff owner allows showExif                   | text present for owner                    | hidden for visitor when off |
| Back link to /explore                              | link   | nav to /explore                                     | URL becomes `/explore`                    | stays                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger        | method | path                         | what request body or query is expected |
| -------------- | ------ | ---------------------------- | -------------------------------------- |
| Page mount     | GET    | /api/photos/:id              | photo record incl. exif + visibility   |
| Click Favorite | POST   | /api/photos/:id/favorite     | `{ favorited: true                     | false }` |
| Click Delete   | DELETE | /api/photos/:id              | 200/204                                |
| Image render   | GET    | /api/photo-files/:storageKey | binary bytes                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/photos__id.spec.ts`
