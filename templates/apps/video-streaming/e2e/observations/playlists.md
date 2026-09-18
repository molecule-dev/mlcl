# Page observations: /playlist/:id (Playlist Detail)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/playlist/<seeded-id>.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                                       | success signal                                       | failure signal    |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| `getByRole('heading').first()`                | heading | shows the playlist title from /api/playlists/:id                       | text matches DB row's `name`/`title`                 | placeholder text  |
| `getByRole('button', { name: /shuffle/i })`   | button  | navigates to a random video in the playlist                            | URL becomes /watch/:id of one of the playlist videos | no navigation     |
| `getByRole('button', { name: /share/i })`     | button  | copies the playlist URL to clipboard, shows confirmation               | "Copied" / "Link copied" toast/text appears          | no feedback shown |
| `getByRole('button', { name: /add video/i })` | button  | opens the picker, selecting a video POSTs to /api/playlists/:id/videos | new video appears in the list and survives a reload  | nothing added     |
| `locator('a[href*="/watch/"]').first()`       | link    | each playlist row opens /watch/:id                                     | URL becomes /watch/:id                               | no navigation     |

## Hidden surfaces opened from this page

| trigger          | what it opens                                                                                                   | elements inside (selector / role / behavior) |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Add video button | inline picker listing available /api/videos with a "Add" button per row that POSTs to /api/playlists/:id/videos |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected       |
| ----------- | ------ | ------------------------- | -------------------------------------------- |
| Mount       | GET    | /api/playlists/:id        | playlist record with embedded `videos` array |
| Open picker | GET    | /api/videos               | candidate videos for adding                  |
| Add video   | POST   | /api/playlists/:id/videos | `{ video_id }`                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-playlists.spec.ts`
