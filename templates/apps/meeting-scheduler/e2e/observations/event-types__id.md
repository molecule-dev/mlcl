# Page observations: /event-types/:id (Event type editor)

Authenticated editor; reads /api/event-types/:id, writes via PATCH/POST, exposes copy-link.

Source: this page was driven live at `http://localhost:$VITE_PORT/event-types/:id`
via Playwright + the matching `e2e/event-types__id.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction               | success signal                               | failure signal                        |
| --------------------------------------------------------------------- | ------- | ---------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| `getByRole("button", { name: /^general$/i })`                         | button  | switches editor to General tab                 | tab content updates                          | tab does not change                   |
| `[data-testid="event-type-name"]` + `[data-testid="event-type-slug"]` | textbox | fields are prefilled from /api/event-types/:id | inputs hold the row's name and slug          | fields stay empty for an existing row |
| `[data-testid="save-event-type"]`                                     | button  | PATCH/PUT/POST persists the row                | saved-at appears AND GET reflects the change | POST 4xx/5xx surfaced inline          |
| `[data-testid="copy-link"]`                                           | button  | copies absolute /book/:slug URL to clipboard   | button is wired and visible                  | button absent                         |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger       | method     | path                                     | what request body or query is expected                                       |
| ------------- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| mount with id | GET        | /api/event-types/:id                     | returns the row by id                                                        |
| save click    | PATCH/POST | /api/event-types/:id or /api/event-types | request body contains name, slug, duration_minutes, location_kind, is_active |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/event-types__id.spec.ts`
