# Page observations: /board/:id (Board canvas)

> Authenticated multiplayer canvas. Renders all `elements` from the
> server, exposes a sticky/select/eraser tool palette, save-snapshot
> CTA, share modal (collaborators), zoom controls, and a properties
> panel for the currently selected element. All mutations round-trip
> through the api/handlers/elements + versions + collaborators routes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                      | role          | expected behavior on interaction                                                                                                                                     | success signal                                                                       | failure signal                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| empty board (`board-title` + `board-canvas-empty` + `board-element-count` = "0")                                                | composite     | a freshly-created board renders the seeded title, the empty-state, and a zero element count                                                                          | title text contains seeded title + empty container visible + count text contains "0" | wrong title / count not zero      |
| seeded element rendering (`board-element-{id}` + `board-element-count` = "1")                                                   | composite     | API-seeded sticky elements render at the correct geometry on the canvas with text content                                                                            | element node visible with content text + count is "1"                                | element missing or wrong count    |
| toolbar tool selection (`board-tool-select` + `board-tool-sticky`)                                                              | composite     | clicking a toolbar tool flips its aria-pressed to true and deselects the others                                                                                      | aria-pressed swaps as expected                                                       | stays false                       |
| `[data-mol-id="board-snapshot"]` (+ `board-snapshot-status`)                                                                    | button        | POST /versions/:boardId; status indicator appears; GET /versions/:boardId returns ≥1 row                                                                             | status visible + version row created                                                 | no version row appears            |
| properties panel text edit (`board-element-{id}` click → `board-properties` + `board-element-text` + `board-element-text-save`) | composite     | selecting an element opens the property panel pre-filled with text; editing + Save PUTs /elements/:boardId/:elementId; GET reflects the new text and survives reload | panel visible, GET shows new text, reload-persists                                   | DB unchanged or panel never opens |
| `[data-mol-id="board-element-color-#bfdbfe"]`                                                                                   | button        | PUT /elements/:boardId/:elementId merging `{ content: { color } }`                                                                                                   | GET reflects new color                                                               | DB unchanged                      |
| `[data-mol-id="board-element-delete"]`                                                                                          | button        | DELETE /elements/:boardId/:elementId; node removed from canvas                                                                                                       | GET no longer lists row + count drops                                                | row remains                       |
| zoom controls (`board-zoom` + `getByRole('button', { name: /zoom\s*out/i })` + `getByRole('button', { name: /zoom\s*in/i })`)   | composite     | zoom indicator reads 100% by default; out drops to 90%; two ins go to 110%                                                                                           | indicator transitions 100% → 90% → 110%                                              | stuck at 100                      |
| share modal invite (`board-share` → `input[type="email"]` (last) + `select` (first) → invite submit)                            | composite     | clicking Share opens the modal; filling email + role and submitting POSTs /collaborators/:boardId; GET /collaborators/:boardId contains the invitee                  | invitee email present in GET response                                                | DB unchanged or modal never opens |
| `[data-mol-id="board-tool-eraser"]` (+ element click)                                                                           | toggle button | selecting eraser then clicking an element DELETEs it via /elements/:boardId/:elementId                                                                               | element row gone from GET /elements/:boardId                                         | stale row remains                 |
| non-owner protection (GET /api/elements/:boardId from another user)                                                             | network       | reading another user's board elements returns 404 (or 403); never 200                                                                                                | response status in {403, 404}                                                        | 200 (data leak)                   |

## Hidden surfaces opened from this page

| trigger                                    | what it opens    | elements inside                             |
| ------------------------------------------ | ---------------- | ------------------------------------------- |
| `[data-mol-id="board-element-{id}"]` click | properties panel | text textbox, color swatches, delete button |
| `[data-mol-id="board-share"]`              | share modal      | email input, role select, invite button     |

## Network calls expected during normal use

| trigger        | method | path                              | what request body or query is expected          |
| -------------- | ------ | --------------------------------- | ----------------------------------------------- |
| page load      | GET    | /api/boards/:id                   | 200 board (404 if non-owner)                    |
| page load      | GET    | /api/elements/:boardId            | 200 array of elements (404/403 if non-owner)    |
| Save snapshot  | POST   | /api/versions/:boardId            | `{ snapshot, change_summary? }`; 2xx            |
| Save text      | PUT    | /api/elements/:boardId/:elementId | `{ content: { text } }`; 2xx                    |
| Color swatch   | PUT    | /api/elements/:boardId/:elementId | `{ content: { color } }`; 2xx                   |
| Delete element | DELETE | /api/elements/:boardId/:elementId | 204                                             |
| Share invite   | POST   | /api/collaborators/:boardId       | `{ email, role }`; 2xx returns collaborator row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/board__id.spec.ts`
