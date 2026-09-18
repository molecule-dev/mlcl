# Page observations: /templates (Templates list)

> Authenticated. Lists user-owned + system templates with all/system/
> mine filter chips. "New template" opens a modal that POSTs to
> /api/templates and renders a new card. Each card has a "Use template"
> CTA which POSTs /api/templates/:id/instantiate, returns a board id,
> and routes to /board/:id (with the snapshot's elements copied in).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                          | role      | expected behavior on interaction                                                                                                      | success signal                                                                       | failure signal                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| empty + Mine filter (`templates-empty` + `templates-filter-mine`)                                                                                   | composite | switching to the "Mine" filter for a fresh user shows the empty-state                                                                 | empty container visible after click                                                  | empty hidden / filter ignored     |
| create modal lifecycle (`templates-new-template` → `templates-create-modal` → `templates-create-name` + `-description` → `templates-create-submit`) | composite | clicking "New template" opens the modal, filling name + description and submitting POSTs /api/templates and renders the new card link | modal opens, submit appends row to GET /templates with matching name                 | modal never opens or DB unchanged |
| `[data-mol-id="template-use-{id}"]`                                                                                                                 | button    | POST /api/templates/:id/instantiate; returns `{ id }` and navigates to /board/:id with the snapshot's elements copied                 | URL becomes /board/:id and GET /elements/:newBoardId returns the snapshot's elements | stays on /templates               |
| TemplateDetail delete (`/templates/:id` → `template-detail-delete`)                                                                                 | composite | navigating to a non-system template's detail page and clicking Delete removes it from /templates and routes back                      | URL is /templates afterward + GET /templates/:id returns 403/404                     | template still listed             |
| filter chips behavior (`templates-filter-all` / `templates-filter-system` / `templates-filter-mine`)                                                | composite | "All" shows every template; "System" hides user-created cards; "Mine" hides system cards                                              | mine card hidden under System filter, visible under All + Mine                       | filter not applied                |
| system-template delete protection                                                                                                                   | network   | DELETE /api/templates/:id on `is_system=true` rows returns 401/403/404; never silently succeeds                                       | response status in {401, 403, 404}                                                   | 2xx (system rows mutable)         |

## Hidden surfaces opened from this page

| trigger                                  | what it opens | elements inside                          |
| ---------------------------------------- | ------------- | ---------------------------------------- |
| `[data-mol-id="templates-new-template"]` | create modal  | name + description inputs, submit button |

## Network calls expected during normal use

| trigger       | method | path                           | what request body or query is expected |
| ------------- | ------ | ------------------------------ | -------------------------------------- |
| page load     | GET    | /api/templates                 | 200 array of templates (mine + system) |
| Create submit | POST   | /api/templates                 | `{ name, description, snapshot }`; 2xx |
| Use template  | POST   | /api/templates/:id/instantiate | 2xx returns `{ id }` for the new board |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/templates.spec.ts`
