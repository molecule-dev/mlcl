# Page observations: /album/:id (AlbumDetail)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up, create an album with photos, then `browser_navigate` to `/album/<id>`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — title, photo-count badge, photo grid, missing-album state.
4. Also navigate to a non-existent album id; observe the not-found state.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/album__id.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                           | role            | expected behavior on interaction                                                     | success signal                                                                   | failure signal                  |
| -------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------- |
| `[data-mol-id="album-title"]` + `[data-mol-id="album-photo-count"]` + `[data-mol-id="album-photo-grid"]` (populated) | container       | shows the album's name, the count of photos in it, and a `PhotoTile` for each member | title text matches `/api/albums/:id.name`, photo count matches GET-images filter | wrong title / count             |
| `[data-mol-id="album-missing"]` (404 branch)                                                                         | container       | shown for unknown album ids                                                          | "This album was not found." copy visible                                         | crashes                         |
| backend invariant: `DELETE /api/albums/:id` on a non-empty album                                                     | (no UI element) | server refuses (400) and the album is still present in the next GET                  | DELETE returns 400 with `error: "empty"`; GET still returns the album            | DELETE 204 (orphans the photos) |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | album detail is fully visible at all times   |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected                      |
| ----------- | ------ | ----------------- | ----------------------------------------------------------- |
| (page load) | GET    | `/api/albums/:id` | the album row; 404 when unknown id                          |
| (page load) | GET    | `/api/images`     | full image list, filtered client-side by `album_id === :id` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/album__id.spec.ts`
