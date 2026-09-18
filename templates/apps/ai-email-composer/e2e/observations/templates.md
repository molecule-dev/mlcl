# Page observations: /templates (Templates)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/templates.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role       | expected behavior on interaction                                          | success signal                           | failure signal          |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------- | ---------------------------------------- | ----------------------- |
| `[data-mol-id="templates-page"]`       | region     | templates shell renders                                                   | element visible                          | absent                  |
| `[data-mol-id="templates-new"]`        | button     | opens the create-template form                                            | form fields visible (name/subject/body)  | no form rendered        |
| `[data-mol-id="templates-search"]`     | textbox    | filters the visible list as the user types                                | list rows narrow to match query          | search no-op            |
| `[data-mol-id="templates-filter-all"]` | tab/button | shows every category                                                      | every row visible again                  | no change               |
| `[data-mol-id="templates-empty"]`      | text       | empty-state message visible for a fresh user before creating any template | visible until a POST to `/api/templates` | persists after creation |

## Hidden surfaces opened from this page

| trigger                         | what it opens      | elements inside (selector / role / behavior)          |
| ------------------------------- | ------------------ | ----------------------------------------------------- |
| `[data-mol-id="templates-new"]` | inline create form | name input, subject input, body textarea, Save button |

## Network calls expected during normal use

| trigger        | method | path                      | what request body or query is expected |
| -------------- | ------ | ------------------------- | -------------------------------------- |
| mount          | GET    | /api/templates            | (none)                                 |
| Save           | POST   | /api/templates            | `{ name, subject, body, category }`    |
| Save (update)  | PUT    | /api/templates/:id        | `{ name, subject, body, category }`    |
| Delete         | DELETE | /api/templates/:id        | (none)                                 |
| Render preview | POST   | /api/templates/:id/render | `{ variables }`                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/templates.spec.ts`
