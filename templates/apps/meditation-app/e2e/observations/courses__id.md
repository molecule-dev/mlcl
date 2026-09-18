# Page observations: /courses/:id (CourseDetail)

Course detail page. Asserts curriculum render and per-day session links.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role    | expected behavior on interaction                       | success signal                               | failure signal  |
| ----------------------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------- | --------------- |
| course title heading                            | heading | renders the course title fetched from /api/courses/:id | heading visible with title                   | heading missing |
| `getByRole("heading", { name: /curriculum/i })` | heading | renders the curriculum section header                  | curriculum heading visible                   | section missing |
| per-day rows `data-testid="course-day-<n>"`     | list    | renders one row per day in the course                  | first day row visible (when course has days) | no day rows     |
| back link to /courses                           | link    | navigates back to /courses index                       | URL becomes /courses                         | URL unchanged   |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path              | what request body or query is expected |
| ------------ | ------ | ----------------- | -------------------------------------- |
| initial load | GET    | /api/courses/:id  | 200 with { course, days[] }            |
| initial load | GET    | /api/sessions/:id | 200 per linked session id              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
