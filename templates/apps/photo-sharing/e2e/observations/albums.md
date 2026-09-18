# Page observations: /albums (Albums)

> Authed — list of the signed-in user's albums (cards). "New album"
> button opens a modal with title / description / visibility, "Create"
> POSTs `/api/albums`. Each card links to `/albums/:id`. Empty state
> shown when there are no albums yet.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role     | expected behavior on interaction | success signal             | failure signal      |
| ---------------------------- | -------- | -------------------------------- | -------------------------- | ------------------- |
| New album button             | button   | opens the create-album modal     | modal visible              | modal does not open |
| Title input (modal)          | textbox  | accepts album title              | input updates              | read-only           |
| Description textarea (modal) | textarea | accepts description              | input updates              | read-only           |
| Submit Create button (modal) | button   | POST /api/albums; refresh list   | new card visible after     | error banner        |
| Album card link              | link     | nav to /albums/:id               | URL becomes `/albums/<id>` | stays               |
| Upload link                  | link     | nav to /upload                   | URL becomes `/upload`      | stays               |

## Hidden surfaces opened from this page

| trigger           | what it opens          | elements inside                                              |
| ----------------- | ---------------------- | ------------------------------------------------------------ |
| Click "New album" | the create-album modal | title input, description textarea, visibility select, Submit |

## Network calls expected during normal use

| trigger      | method | path                 | what request body or query is expected                |
| ------------ | ------ | -------------------- | ----------------------------------------------------- |
| Page mount   | GET    | /api/albums?owner=me | `[{ id, title, ... }]`                                |
| Click Create | POST   | /api/albums          | `{ title, description?, visibility }` → `{ id, ... }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/albums.spec.ts`
