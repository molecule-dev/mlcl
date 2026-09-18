# Page observations: /editor/:id (Editor)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → seedProject() → browser_navigate to `/editor/<id>`
2. browser_snapshot — three-pane shell: layers (left), toolbar + canvas (center), properties (right)
3. After clicking each tool, the canvas grows a shape; clicking it in the layer list shows properties + delete

## Page state assumed

- [x] Authenticated; route param `:id` must be a project the user owns

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                                               | success signal                                                             | failure signal        |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------- |
| `[data-mol-id="editor-project-name"]`       | button  | clicking the project name swaps it for an input ready to rename                | input becomes focused; auto-saves on blur via PUT `/api/projects/:id`      | name doesn't change   |
| `[data-mol-id="editor-project-name-input"]` | textbox | typing + blur saves the project name                                           | next page load shows the new name                                          | save fails / reverts  |
| `[data-mol-id="editor-tool-rect"]`          | button  | activates the rectangle tool and POSTs `/api/shapes` with type rect            | new `<rect>` appears in the canvas SVG and a layer entry shows             | nothing happens       |
| `[data-mol-id="editor-tool-ellipse"]`       | button  | activates ellipse and POSTs `/api/shapes` with type ellipse                    | new `<ellipse>` appears in the canvas SVG                                  | nothing happens       |
| `[data-mol-id="editor-tool-text"]`          | button  | activates text and POSTs `/api/shapes` with type text                          | new `<text>` element appears with copy "Atelier"                           | nothing happens       |
| `[data-mol-id="editor-tool-line"]`          | button  | activates line and POSTs `/api/shapes` with type line                          | new `<line>` appears in the canvas SVG                                     | nothing happens       |
| `[data-mol-id="editor-tool-select"]`        | button  | activates the select tool (no shape created)                                   | toolbar button shows the active highlight                                  | nothing changes       |
| `[data-mol-id="editor-tool-hand"]`          | button  | activates the hand/pan tool (no shape created)                                 | toolbar button shows the active highlight                                  | nothing changes       |
| `[data-mol-id="editor-share"]`              | button  | POSTs `/api/projects/:id/collaborators`                                        | inline status banner ("Collaborator invite sent" or backend error) appears | no banner             |
| `[data-mol-id="editor-export"]`             | button  | POSTs `/api/exports`                                                           | inline status banner ("Export ready" / "Export queued" / error) appears    | no banner             |
| `[data-mol-id^="editor-layer-"]`            | button  | clicking a layer selects that shape and reveals its properties + Delete button | properties panel switches from empty placeholder to type+coords            | properties stay empty |
| `[data-mol-id="editor-shape-delete"]`       | button  | DELETE `/api/shapes/:id`                                                       | layer disappears from list and SVG                                         | layer remains         |
| `[data-mol-id="editor-zoom-label"]`         | text    | clicking +/- buttons changes the displayed zoom percent                        | label updates between 25% and 400%                                         | label stays           |

## Hidden surfaces opened from this page

| trigger            | what it opens                      | elements inside (selector / role / behavior)              |
| ------------------ | ---------------------------------- | --------------------------------------------------------- |
| Share/Export click | inline status banner under toolbar | reads from `[data-mol-id="editor-status"]`                |
| selecting a layer  | properties panel populates         | shows shape type, coordinates, fill swatch, Delete button |
| invalid id in URL  | "Project unavailable" error block  | `<Link to="/dashboard">` "Back to dashboard" button       |

## Network calls expected during normal use

| trigger                     | method | path                              | what request body or query is expected               |
| --------------------------- | ------ | --------------------------------- | ---------------------------------------------------- |
| initial render              | GET    | `/api/projects/:id`               | bearer-authed; returns the project record            |
| initial render              | GET    | `/api/shapes?projectId=<id>`      | bearer-authed; returns shape array                   |
| rename                      | PUT    | `/api/projects/:id`               | `{ name }`                                           |
| pick tool (non-select/hand) | POST   | `/api/shapes`                     | `{ projectId, type, x, y, width, height, fill, ...}` |
| delete shape                | DELETE | `/api/shapes/:id`                 | bearer-authed                                        |
| share                       | POST   | `/api/projects/:id/collaborators` | `{ user_id, role }`                                  |
| export                      | POST   | `/api/exports`                    | `{ projectId, format, quality, scale }`              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/editor__id.spec.ts`
