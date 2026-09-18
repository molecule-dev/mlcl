# Page observations: /projects/:id (Editor)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` after creating
> a project.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); project created beforehand

## Elements

| selector / accessible name                              | role    | expected behavior on interaction       | success signal                                           | failure signal                |
| ------------------------------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| `getByRole('heading', { level: 1 })` shows project name | heading | render project name as page title      | visible, has non-empty text                              | absent or generic placeholder |
| select tool button (label "mouse")                      | button  | switch active tool to select           | data-mol-tool changes / button highlights                | tool unchanged                |
| transform tool button (label "transform")               | button  | switch active tool to transform        | data-mol-tool changes / button highlights                | tool unchanged                |
| edit tool button (label "edit")                         | button  | switch active tool to edit             | data-mol-tool changes / button highlights                | tool unchanged                |
| text tool button (label "text_fields")                  | button  | switch active tool to text             | data-mol-tool changes / button highlights                | tool unchanged                |
| `getByRole('button', { name: /Add layer/i })`           | button  | POST /api/layers, append to layer list | new layer row appears in panel; GET /api/layers shows it | nothing changes               |
| `getByRole('link', { name: /Export/i })`                | link    | navigate to /projects/:id/export       | URL ends with /export                                    | stays                         |

## Hidden surfaces opened from this page

| trigger                                          | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------ | ------------- | -------------------------------------------- |
| (none — single-page editor with no modals/menus) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger         | method | path              | what request body or query is expected |
| --------------- | ------ | ----------------- | -------------------------------------- |
| page load       | GET    | /api/projects/:id | (none)                                 |
| page load       | GET    | /api/layers       | ?projectId=:id                         |
| Add layer click | POST   | /api/layers       | { projectId, name, type }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id.spec.ts`
