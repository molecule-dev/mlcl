# Page observations: /library (Library)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up via `signup(page)` then `browser_navigate` → `/library`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — hero, "New edit" button, filter chips, photo grid, album rail.
4. Click "New edit" — observe the upload modal.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/library.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                  | role            | expected behavior on interaction                                                                                                                     | success signal                                                        | failure signal              |
| ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| `[data-mol-id="library-empty-cta"]` ("Add your first frame", visible when library is empty) | button          | opens the `[data-mol-id="library-new-modal"]` upload dialog                                                                                          | modal visible with name + URL inputs                                  | nothing happens             |
| `[data-mol-id="library-new-submit"]` (modal submit, after filling name + URL)               | button          | POST `/api/images` with `{ name, original_url }`; on 201 navigates to `/editor?photo=<id>` and the new image appears in subsequent GET `/api/images` | URL becomes `/editor?photo=<id>`, `listImages()` includes the new row | stays on modal, POST != 201 |
| `[data-mol-id="library-hero-headline"]` (`data-photo-count`)                                | text            | reflects the count of `/api/images` returned for this user                                                                                           | `data-photo-count` matches the GET length                             | wrong / stale count         |
| `[data-mol-id="library-filter-edited"]` (and `all`/`recent`/`starred`)                      | button          | sets the filter id; toggles `data-active="true"` on click                                                                                            | filter chip highlights, grid (or `library-empty`) updates             | unchanged                   |
| `[data-mol-id="library-album-<id>"]` (album tile in rail)                                   | link            | navigates to `/album/<id>`                                                                                                                           | URL becomes `/album/<id>`                                             | stays                       |
| backend invariant: GET `/api/albums` ordering                                               | (no UI element) | server returns albums alphabetically by `name`                                                                                                       | sort matches `[...names].sort(localeCompare)`                         | unsorted                    |

## Hidden surfaces opened from this page

| trigger                                                                  | what it opens                                                 | elements inside (selector / role / behavior)                                                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[data-mol-id="library-empty-cta"]` (or `library-new-edit` toolbar pill) | `[data-mol-id="library-new-modal"]` "Open a new image" dialog | `[data-mol-id="library-new-name"]` text input (required), `[data-mol-id="library-new-url"]` url input (required), Cancel button, `[data-mol-id="library-new-submit"]` submit button |

## Network calls expected during normal use

| trigger              | method | path          | what request body or query is expected |
| -------------------- | ------ | ------------- | -------------------------------------- |
| (page load)          | GET    | `/api/images` | list of the user's images              |
| (page load)          | GET    | `/api/albums` | list of the user's albums              |
| `library-new-submit` | POST   | `/api/images` | `{ name, original_url }` → 201         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/library.spec.ts`
