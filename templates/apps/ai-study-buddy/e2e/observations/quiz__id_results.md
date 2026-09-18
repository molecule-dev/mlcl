# Page observations: /quiz/:id/results (Quiz Results)

Captured by walking the live quiz-results page (vite=3110, api=4110)
after a fresh `mlcl create`. Auth-protected — sign up first, seed a
quiz, and submit at least one attempt.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role      | expected behavior on interaction                                    | success signal                                                      | failure signal           |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| `[data-mol-id="page-quiz-results"]`                                | container | the page shell renders after auth                                   | element visible                                                     | redirected to `/login`   |
| `[data-mol-id="results-score"]`                                    | element   | displays the latest attempt's `score` as a percentage (e.g. "100%") | numeric percent visible inside the hero badge                       | shows fallback / loading |
| `getByRole('heading', { name: /quiz complete/i })`                 | heading   | h1 of the page                                                      | rendered                                                            | absent                   |
| `getByRole('heading', { level: 3, name: /per-question review/i })` | heading   | sub-heading for the per-question list                               | rendered when at least one attempt exists                           | absent on empty state    |
| `getByRole('list')` (per-question review ol)                       | list      | one `li` per quiz question with status badge                        | item count equals quiz.questions.length                             | empty list               |
| status badges per question (correct / incorrect / skipped)         | label     | label colour reflects whether user matched `correct_index`          | "Correct" badge appears for matching answers, "Incorrect" otherwise | wrong status colour      |
| `getByRole('link', { name: /retry quiz/i })`                       | link      | navigates back to `/quiz/:id` for another attempt                   | URL becomes `/quiz/:id`                                             | URL stays                |

## Hidden surfaces opened from this page

| trigger                    | what it opens | elements inside (selector / role / behavior) |
| -------------------------- | ------------- | -------------------------------------------- |
| (none — flat results page) | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                        | what request body or query is expected                         |
| ---------- | ------ | --------------------------- | -------------------------------------------------------------- |
| page mount | GET    | `/api/quizzes/:id`          | none — Bearer token; returns the quiz with its questions       |
| page mount | GET    | `/api/quizzes/:id/attempts` | none — Bearer token; returns the user's attempts for this quiz |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/25-quiz__id_results.spec.ts`
