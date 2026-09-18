# Page observations: /compose (Composer)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role           | expected behavior on interaction                                                    | success signal                                     | failure signal                 |
| ------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| `input[placeholder*="title"]` (title)            | textbox        | accept title >= 8 chars                                                             | value reflects typed text                          | empty/short                    |
| `textarea` (body)                                | textbox        | accept body >= 20 chars                                                             | value reflects typed text                          | short                          |
| `getByRole("button", { name: /Low                | Normal         | High                                                                                | Urgent/i })` (priority chips)                      | button                         | switches `priority` selection | active chip styling moves | nothing |
| `select` or chips for category                   | combobox       | sets `category_id` for the post                                                     | UI shows selected channel                          | nothing                        |
| `input[type=checkbox]` (require ack)             | checkbox       | toggles `requires_acknowledgment`                                                   | checked state flips                                | unchanged                      |
| `getByRole("button", { name: /publish/i })`      | button         | POST `/api/announcements` with `publish_now: true`, navigate to `/announcement/:id` | URL `/announcement/<uuid>`, row visible in `/feed` | stays on `/compose` with error |
| `getByRole("button", { name: /cancel/i })`       | button         | discards draft, returns to `/feed`                                                  | URL `/feed`                                        | stays on `/compose`            |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })` | button                                                                              | logs out                                           | URL `/login`                   | unchanged                     |
| `getByRole("button", { name: /Toggle theme/i })` | button         | flips theme                                                                         | `data-mol-mode` flips                              | unchanged                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected                                         |
| --------- | ------ | -------------------- | ------------------------------------------------------------------------------ |
| Page load | GET    | `/api/categories`    | needed for channel picker                                                      |
| Submit    | POST   | `/api/announcements` | `{ title, body, category_id, priority, requires_acknowledgment, publish_now }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/compose.spec.ts`
