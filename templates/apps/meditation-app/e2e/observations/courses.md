# Page observations: /courses (Courses)

Multi-day courses index. Asserts course cards and navigation to a course detail page.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction                                            | success signal              | failure signal |
| --------------------------------------- | ------- | --------------------------------------------------------------------------- | --------------------------- | -------------- |
| course cards render                     | list    | fetches /api/courses and renders one card per course with title + day_count | at least one card visible   | list empty     |
| course card link `a[href^="/courses/"]` | link    | clicking a card navigates to /courses/<slug>                                | URL becomes /courses/<slug> | URL unchanged  |
| page heading + intro copy               | heading | page renders a `Courses` heading and intro section                          | heading visible             | page blank     |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path         | what request body or query is expected |
| ------------ | ------ | ------------ | -------------------------------------- |
| initial load | GET    | /api/courses | 200 with seeded courses                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
