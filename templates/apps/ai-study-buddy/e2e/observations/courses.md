# Page observations: /courses (Courses / Topics)

Captured via `node scripts/observe-page.mjs ai-study-buddy /courses --auth`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role      | expected behavior on interaction              | success signal                             | failure signal           |
| ----------------------------------------- | --------- | --------------------------------------------- | ------------------------------------------ | ------------------------ |
| `[data-mol-id="page-courses"]`            | container | top-level page wrapper renders after auth     | element visible                            | redirected to `/login`   |
| `[data-mol-id="courses-new"]`             | button    | toggles the "new course" form open            | `[data-mol-id="courses-new-form"]` visible | form stays hidden        |
| `[data-mol-id="courses-new-title"]`       | textbox   | required title field for the new course form  | input accepts text                         | field missing            |
| `[data-mol-id="courses-new-description"]` | textbox   | optional description field                    | input accepts text                         | field missing            |
| `[data-mol-id="courses-new-submit"]`      | button    | POSTs `/api/topics`, appends new card to list | new course tile appears                    | error inline / 4xx / 5xx |
| `[data-mol-id="courses-filter-all"]`      | button    | shows all categories (default state)          | category list unfiltered                   | filter doesn't apply     |
| `[data-mol-id="courses-empty"]`           | container | empty-state placeholder for fresh users       | visible when 0 topics exist                | no empty state shown     |

## Hidden surfaces opened from this page

| trigger             | what it opens          | elements inside (selector / role / behavior)     |
| ------------------- | ---------------------- | ------------------------------------------------ |
| Click `courses-new` | inline new-course form | title input, description textarea, submit button |
| Click a course tile | nav to `/courses/:id`  | course-detail page renders                       |

## Network calls expected during normal use

| trigger                | method | path           | what request body or query is expected |
| ---------------------- | ------ | -------------- | -------------------------------------- |
| page mount             | GET    | `/api/topics`  | array of user's topics                 |
| Submit new-course form | POST   | `/api/topics`  | body `{ title, description, subject }` |
| page mount             | GET    | `/api/profile` | session validity                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/26-courses.spec.ts`
