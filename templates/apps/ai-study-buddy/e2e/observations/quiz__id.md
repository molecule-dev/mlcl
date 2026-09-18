# Page observations: /quiz/:id (Quiz)

Captured by walking the live quiz page (vite=3110, api=4110) after a
fresh `mlcl create`. Auth-protected — sign up first and seed a quiz.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction                                                                      | success signal                                                   | failure signal                   |
| --------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `[data-mol-id="page-quiz"]`                               | container | the page shell renders after auth                                                                     | element visible                                                  | redirected to `/login`           |
| `getByRole('heading', { level: 1 })`                      | heading   | shows the quiz title from `GET /api/quizzes/:id`                                                      | rendered with the seeded title                                   | placeholder "Practice quiz" text |
| `[data-mol-id^="quiz-option-"]` (4 buttons per question)  | button    | selects one option as the user's answer for the current question                                      | button gets the `border-primary` highlight; Next becomes enabled | clicking does nothing            |
| `getByRole('button', { name: /previous/i })`              | button    | navigates to the previous question (disabled on Q1)                                                   | `questionIndex` decrements; question text updates                | clicking does nothing on Q1      |
| `[data-mol-id="quiz-next"]` (visible until last question) | button    | advances to the next question; disabled until an option is selected                                   | next question's prompt renders; progress bar fills               | button stays disabled            |
| `[data-mol-id="quiz-submit"]` (last question only)        | button    | submits POST `/api/quizzes/:id/submit` with `{ answers: number[] }` and routes to `/quiz/:id/results` | URL becomes `/quiz/:id/results`; `results-score` renders         | error paragraph appears          |
| `getByRole('link', { name: /end quiz/i })`                | link      | navigates to `/courses` to abandon the quiz                                                           | URL becomes `/courses`                                           | URL stays                        |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------ | ------------- | -------------------------------------------- |
| (none — single-page quiz, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                      | what request body or query is expected                                            |
| -------------------- | ------ | ------------------------- | --------------------------------------------------------------------------------- |
| page mount           | GET    | `/api/quizzes/:id`        | none — Bearer token; returns `{ id, title, questions[] }`                         |
| Submit answers click | POST   | `/api/quizzes/:id/submit` | `{ answers: number[] }` JSON; 200 returns `{ score, correct_count, total_count }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/24-quiz__id.spec.ts`
