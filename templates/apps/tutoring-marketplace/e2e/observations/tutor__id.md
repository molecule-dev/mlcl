# Page observations: /tutor/:id (TutorProfile)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (signed in or not)

## Elements

| selector / accessible name                                                     | role           | expected behavior on interaction | success signal                      | failure signal      |
| ------------------------------------------------------------------------------ | -------------- | -------------------------------- | ----------------------------------- | ------------------- |
| heading with tutor name                                                        | heading        | renders display_name             | "Dr. Maya Rivera" present           | name missing        |
| Verified badge                                                                 | generic        | shows verified status            | aria-label "VERIFIED"               | missing             |
| Rating, Sessions, Avg response, Repeat students stats                          | stat tiles     | seed data renders                | 4.95★, 1,284, 30 min visible        | not rendered        |
| `getByRole('link', { name: /book a session/i })`                               | link           | go to /book/:id                  | URL contains /book/                 | nav fails           |
| Subject pills (Physics, Calculus, AP Physics C, IB Physics HL, Linear algebra) | tag            | render tutor.subjects array      | all 5 visible                       | missing             |
| Recent reviews section                                                         | section        | renders seeded reviews           | "Priya Patel", "Tomás León" visible | empty               |
| Availability slot link                                                         | link           | navigates to /book/:id           | URL changes                         | nav fails           |
| `getByRole('link', { name: /see full schedule                                  | view all/i })` | link                             | go to /book/:id                     | URL contains /book/ | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                         | what request body or query is expected |
| --------- | ------ | ---------------------------- | -------------------------------------- |
| page load | GET    | /api/tutors/:id              | returns full tutor row                 |
| page load | GET    | /api/reviews/tutor/:id       | returns seeded reviews                 |
| page load | GET    | /api/tutors/:id/availability | returns slot list                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tutor__id.spec.ts`
