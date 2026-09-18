# Page observations: /boards (Boards dashboard)

> Authenticated dashboard of the user's boards. Empty-state shown for
> fresh users; otherwise a search-filtered grid of board cards plus a
> persistent KPI tracking the current count. The "New board" CTA POSTs
> a board and routes to its canvas. Cursor-color swatches persist to
> localStorage. Free-tier `maxBoards` enforcement returns 402/403/429.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role      | expected behavior on interaction                                 | success signal                                    | failure signal                  |
| -------------------------------------------------------------------- | --------- | ---------------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `[data-mol-id="boards-empty"]`                                       | container | empty-state copy when the user has zero boards                   | visible when no rows                              | hidden when no rows             |
| `[data-mol-id="boards-count"]`                                       | text      | live count of the user's boards (mirrors GET /api/boards length) | "0" → "1" after create                            | stuck at 0                      |
| `[data-mol-id="boards-new-board"]`                                   | button    | POST /api/boards → 2xx → navigate to /board/:id                  | URL becomes /board/:id and a new board row exists | 4xx or stays on /boards         |
| `[data-mol-id="boards-grid"]`                                        | grid      | populated grid of board cards once any boards exist              | visible when count > 0                            | always hidden                   |
| `[data-mol-id="boards-search"]`                                      | textbox   | client-side filter over the rendered grid by title               | only matching titles visible                      | no filtering                    |
| `[data-mol-id^="cursor-color-"]` (nth swatch)                        | button    | persists `data-mol-id`-keyed cursor color to localStorage        | aria-pressed=true survives reload                 | preference lost on reload       |
| board card heading (`getByRole('heading', { name: <board title> })`) | heading   | one per board in the grid                                        | shown for every board                             | missing card for existing board |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                          | method | path                   | what request body or query is expected                                |
| -------------------------------- | ------ | ---------------------- | --------------------------------------------------------------------- |
| page load                        | GET    | /api/boards            | 200 array (or 401 if unauthed)                                        |
| New board                        | POST   | /api/boards            | `{ title? }`; 2xx returns `{ id }`; 402/403/429 when over `maxBoards` |
| board card click                 | (link) | /board/:id (SPA route) | n/a                                                                   |
| Toggle visibility (programmatic) | PUT    | /api/boards/:id        | `{ is_public }`; 2xx persists                                         |
| Soft-delete                      | DELETE | /api/boards/:id        | 204; subsequent GET returns 404                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/boards.spec.ts`
