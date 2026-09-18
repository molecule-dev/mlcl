# Page observations: /quiz/:id/edit (QuizBuilder)

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated, owner of the quiz. Use `createQuizViaApi(page)` to mint a draft, then navigate to `/quiz/{id}/edit`.

## Elements

| selector / accessible name                             | role             | expected behavior on interaction                                                                    | success signal                                                                              | failure signal                                |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `getByTestId('quiz-builder')`                          | landmark `<div>` | rendered after load                                                                                 | element visible                                                                             | "Loading editor…" persists                    |
| `getByTestId('quiz-status')`                           | badge            | shows "Draft" or "Published"                                                                        | text matches quiz.status                                                                    | mismatch                                      |
| `getByTestId('quiz-title-input')`                      | input text       | typing + blur saves via PUT /api/quizzes/{id}                                                       | new title persisted (re-load shows updated title)                                           | unchanged in DB                               |
| `getByTestId('add-first-question')` (when 0 questions) | button           | POST /api/questions → first question; tab list shows it                                             | question editor + tab visible                                                               | unchanged                                     |
| `getByTestId('add-question')` (sidebar plus button)    | button           | POST /api/questions → appends question; new tab activates                                           | question count increments; aria-label "Add question"                                        | unchanged                                     |
| `getByTestId('question-tab-0')` etc.                   | button           | activates that question in editor                                                                   | question editor reflects active question                                                    | unchanged                                     |
| `getByTestId('question-prompt')`                       | textarea         | typing + blur PATCH /api/questions/{id} `{ prompt }`                                                | reload shows new prompt                                                                     | unchanged                                     |
| `getByTestId('choice-input-A')` etc.                   | input text       | typing + blur PUT /api/questions/{id} `{ choices }`                                                 | reload shows new choices                                                                    | unchanged                                     |
| `getByTestId('mark-correct-A')` etc.                   | radio input      | clicking PUT /api/questions/{id} `{ correct_answer }`; chosen choice gets ring                      | radio shows checked, server reflects new correct_answer                                     | unchanged                                     |
| `getByTestId('delete-question')`                       | button           | DELETE /api/questions/{id}; remove from list                                                        | tab disappears, GET /api/questions/quiz/{id} reflects removal                               | unchanged                                     |
| `getByTestId('publish-quiz')`                          | submit           | POST /api/quizzes/{id}/publish if all questions valid; else show "Add at least two answer choices…" | status badge becomes "Published"; subsequent GET /api/quizzes/{id} returns status=published | error message visible, status remains "Draft" |
| `getByTestId('builder-status')`                        | message          | shows publish error or success copy                                                                 | text visible                                                                                | missing                                       |
| `getByRole('link', { name: /sparq home/i })`           | link             | navigate to /                                                                                       | URL = /                                                                                     | otherwise                                     |
| `getByRole('button', { name: /toggle theme/i })`       | button           | flips data-theme                                                                                    | data-theme attr changes                                                                     | unchanged                                     |
| `getByRole('button', { name: /open user menu/i })`     | button           | opens user-menu popover                                                                             | popover visible                                                                             | missing                                       |
| `getByRole('link', { name: /privacy/i })`              | link             | /privacy                                                                                            | URL changes                                                                                 | otherwise                                     |
| `getByRole('link', { name: /terms/i })`                | link             | /terms                                                                                              | URL changes                                                                                 | otherwise                                     |
| `getByRole('button', { name: /language/i })`           | button           | language switcher                                                                                   | popover visible                                                                             | no popover                                    |

## Hidden surfaces opened from this page

| trigger      | what it opens           | elements inside                                                                     |
| ------------ | ----------------------- | ----------------------------------------------------------------------------------- |
| Add question | inline editor populates | question editor with prompt + 4 choice inputs + 4 radio buttons; auto-saves on blur |

## Network calls expected during normal use

| trigger         | method | path                      | body / query                                                                              |
| --------------- | ------ | ------------------------- | ----------------------------------------------------------------------------------------- |
| page load       | GET    | /api/quizzes/{id}         | 200 quiz row                                                                              |
| page load       | GET    | /api/questions/quiz/{id}  | 200 question array                                                                        |
| title save      | PUT    | /api/quizzes/{id}         | `{ title }`; 200                                                                          |
| add question    | POST   | /api/questions            | `{ quiz_id, prompt, type, choices, correct_answer, points, time_limit_s, position }`; 201 |
| edit prompt     | PUT    | /api/questions/{id}       | `{ prompt }`; 200                                                                         |
| edit choices    | PUT    | /api/questions/{id}       | `{ choices: [...] }`; 200                                                                 |
| set correct     | PUT    | /api/questions/{id}       | `{ correct_answer }`; 200                                                                 |
| delete question | DELETE | /api/questions/{id}       | 204                                                                                       |
| publish         | POST   | /api/quizzes/{id}/publish | `{}`; 200 returns updated quiz with status='published'                                    |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every input round-tripped via API (read-after-write)
- [x] publish requires complete questions (validation surface)
- [x] delete confirmed via GET re-fetch
- [x] all rows have a corresponding test in `e2e/quiz-builder.spec.ts`
