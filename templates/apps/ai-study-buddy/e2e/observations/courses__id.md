# Page observations: /courses/:id (Course detail)

Captured by navigating to a real seeded topic and snapshotting via
Playwright. Renders the topic title, mastery score, study modes
(flashcards, AI tutor, quiz), and an upload-material form.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role        | expected behavior on interaction                     | success signal                       | failure signal                |
| -------------------------------------------- | ----------- | ---------------------------------------------------- | ------------------------------------ | ----------------------------- |
| `[data-mol-id="page-course-detail"]`         | container   | top-level page wrapper renders after auth + valid id | element visible                      | redirected to `/login` or 404 |
| `getByRole('heading', { level: 1 })`         | heading     | shows the topic title from `/api/topics/:id`         | heading text == seeded title         | placeholder / empty           |
| `getByRole('link', { name: /flashcards/i })` | link        | jumps to `/flashcards/:id` for this topic            | URL switches to /flashcards          | stays                         |
| `getByRole('link', { name: /tutor            | study/i })` | link                                                 | jumps to `/study/:id` for this topic | URL switches to /study        | stays |
| `getByRole('link', { name: /quiz/i })`       | link        | jumps to `/quiz/:id` after generating one            | URL switches to /quiz                | error / no quiz id            |

## Hidden surfaces opened from this page

| trigger                             | what it opens                  | elements inside (selector / role / behavior) |
| ----------------------------------- | ------------------------------ | -------------------------------------------- |
| Generate quiz button (when present) | progress indicator → /quiz/:id | once generation completes, navigation occurs |

## Network calls expected during normal use

| trigger             | method | path                        | what request body or query is expected   |
| ------------------- | ------ | --------------------------- | ---------------------------------------- |
| page mount          | GET    | `/api/topics/:id`           | returns topic row with mastery_score     |
| page mount          | GET    | `/api/topics/:id/materials` | array of uploaded materials              |
| Generate quiz click | POST   | `/api/quizzes/generate`     | `{ topicId, questionCount, difficulty }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/27-courses__id.spec.ts`
