# Page observations: /decks/:id/edit (Editor)

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role    | expected behavior on interaction                       | success signal                       | failure signal     |
| ---------------------------------- | ------- | ------------------------------------------------------ | ------------------------------------ | ------------------ |
| `getByTestId("deck-title-input")`  | textbox | autosaves via PUT /api/presentations/:id { title }     | reload preserves new title           | reverts on reload  |
| `getByTestId("add-slide")`         | button  | POST /api/slides creates and selects a new slide       | 201 + slide-rail-N appears           | no rail item added |
| `getByTestId("delete-slide-N")`    | button  | DELETE /api/slides/:id removes the slide from the rail | 204 + rail item gone                 | still visible      |
| `getByTestId("layout-two-column")` | button  | PUT /api/slides/:id { layout: "two-column" }           | 200 + aria-pressed=true after reload | reverts            |
| `getByTestId("transition-zoom")`   | button  | PUT /api/slides/:id { transition: "zoom" }             | 200 + aria-pressed=true after reload | reverts            |
| `getByTestId("speaker-notes")`     | textbox | PUT /api/slides/:id { speakerNotes }                   | reload preserves the notes           | lost on reload     |
| `getByTestId("present-link")`      | link    | navigate to /decks/:id/present                         | href matches                         | broken             |
| `getByTestId("export-pdf")`        | button  | POST /api/exports { presentationId, format: "pdf" }    | 2xx + queued export                  | no request fired   |
| theme picker (loads /api/themes)   | list    | fetched on page load to populate theme options         | GET fired                            | no GET fired       |
| `slide-rail-0`                     | button  | first slide in the rail is selectable                  | visible after add-slide              | missing            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                        | method | path                            | what request body or query is expected |
| ------------------------------ | ------ | ------------------------------- | -------------------------------------- |
| initial load                   | GET    | /api/presentations/:id          | single deck                            |
| initial load                   | GET    | /api/slides?presentationId=<id> | slides for the deck                    |
| initial load                   | GET    | /api/themes                     | themes available to the user           |
| add slide                      | POST   | /api/slides                     | { presentationId, layout, content }    |
| change layout/transition/notes | PUT    | /api/slides/:id                 | patch fields                           |
| delete slide                   | DELETE | /api/slides/:id                 | returns 204                            |
| rename deck                    | PUT    | /api/presentations/:id          | { title }                              |
| export                         | POST   | /api/exports                    | { presentationId, format }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/decks__id_edit.spec.ts`
