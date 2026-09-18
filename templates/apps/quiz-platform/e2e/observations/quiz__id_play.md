# Page observations: /quiz/:id/play (QuizPlay)

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated. Quiz must have at least one published question.
  - **Solo path**: navigate without `?sessionId`. Page POSTs /api/sessions, joins, starts a fresh solo session.
  - **Hosted path**: navigate with `?sessionId={id}` (set by HostLobby). Page joins the existing session.

## Elements

| selector / accessible name                 | role             | expected behavior on interaction                                                                                        | success signal                                                                    | failure signal                  |
| ------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| `getByTestId('quiz-loading')`              | landmark         | shown while session is being set up                                                                                     | "Loading quiz…" visible                                                           | persists indefinitely (failure) |
| `getByTestId('quiz-play')`                 | landmark `<div>` | rendered once session + first question loaded                                                                           | element visible                                                                   | error block visible             |
| `getByTestId('streak')`                    | badge            | "{count} streak"; resets to 0 on wrong answer                                                                           | text reflects current streak                                                      | wrong/unchanged                 |
| `getByTestId('score')`                     | badge            | "{score} pts"; increases on correct answer                                                                              | text reflects accumulated score                                                   | unchanged after correct         |
| `getByRole('button', { name: /^exit$/i })` | button           | navigates back to `/quiz/{id}`                                                                                          | URL = /quiz/{id}                                                                  | otherwise                       |
| `getByTestId('question-counter')`          | text             | "Question {current} of {total}"                                                                                         | matches `questionIndex+1` and `total`                                             | wrong                           |
| `getByTestId('timer')`                     | text             | counts down from `time_limit_s`; auto-submits empty answer at 0                                                         | reaches 00 then result reveals                                                    | timer doesn't tick              |
| `getByTestId('question-prompt')`           | heading-ish      | shows current question prompt                                                                                           | matches API question                                                              | wrong                           |
| `getByTestId('answer-grid')`               | container        | one button per choice                                                                                                   | 2-4 buttons visible                                                               | empty                           |
| `getByTestId('answer-A')` etc.             | button           | POST /api/sessions/{sid}/answer with `{ question_id, answer, time_taken_ms }`; reveals correct/wrong; locks all answers | data-correct="true" on correct button; "Spark earned!" or "The answer was X" line | error, no reveal                |
| `getByTestId('answer-result')`             | container        | shows "Spark earned!" or correct-answer copy                                                                            | visible after submit                                                              | missing                         |
| `getByTestId('next-question')`             | button           | advances to next question or `See results` if last → /quiz/{id}/results?sessionId={id}                                  | URL changes to /results or next question loaded with timer reset                  | unchanged                       |

## Hidden surfaces opened from this page

| trigger                     | what it opens | elements inside                                                                                     |
| --------------------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| Auto-submit on timer expiry | result panel  | renders the same answer-result container with "incorrect" feedback; "Next question" button advances |

## Network calls expected during normal use

| trigger           | method | path                              | body / query                                                                          |
| ----------------- | ------ | --------------------------------- | ------------------------------------------------------------------------------------- |
| page mount        | GET    | /api/quizzes/{id}                 | 200                                                                                   |
| page mount        | GET    | /api/questions/quiz/{id}          | 200 (must be non-empty)                                                               |
| solo path mount   | POST   | /api/sessions                     | `{ quiz_id }`; 201                                                                    |
| solo path mount   | POST   | /api/sessions/{id}/join           | `{ nickname }`; 201                                                                   |
| solo path mount   | POST   | /api/sessions/{id}/start          | `{}`; 200                                                                             |
| hosted path mount | POST   | /api/sessions/{id}/join           | `{ nickname }`; 201 or 409 (already joined)                                           |
| answer submit     | POST   | /api/sessions/{sid}/answer        | `{ question_id, answer, time_taken_ms }`; 200 returns `{ is_correct, points_earned }` |
| advance past last | POST   | /api/sessions/{sid}/next-question | `{}`; 200 (best-effort)                                                               |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] correct answer scoring confirmed (score increments)
- [x] wrong answer feedback confirmed (streak resets)
- [x] timer expiry → auto submit covered (assert reveal panel appears)
- [x] last-question → "See results" CTA navigates to `/results`
- [x] all rows have a corresponding test in `e2e/quiz-play.spec.ts`
