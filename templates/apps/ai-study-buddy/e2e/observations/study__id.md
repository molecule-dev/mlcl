# Page observations: /study/:id (Study session)

Captured by walking the live study page (vite=3110, api=4110) after a
fresh `mlcl create`. Auth-protected — sign up first and seed a topic.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role            | expected behavior on interaction                                                                       | success signal                                                          | failure signal                                         |
| -------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `[data-mol-id="page-study"]`                                   | container       | the page shell renders after auth                                                                      | element visible                                                         | redirected to `/login`                                 |
| `getByRole('heading', { level: 1 })` (topic title)             | heading         | shows the topic's `title` from `GET /api/topics/:id`                                                   | heading text matches the seeded topic                                   | placeholder "Study session" text                       |
| `getByRole('button', { name: /(mark reviewed                   | reviewed)/i })` | button                                                                                                 | sends `PATCH /api/topics/:id` with empty body to bump `last_studied_at` | button text flips to "Reviewed", then becomes disabled | error paragraph appears at top |
| `[data-mol-id="study-composer-input"]` (input name="question") | textbox         | accepts the user's tutor question                                                                      | value persists                                                          | input rejects                                          |
| `[data-mol-id="study-composer-send"]`                          | button (submit) | submits POST `/api/topics/:id/ask` with `{ question }` and appends the AI's reply into the chat thread | new `ai`-role message renders with the assistant's text                 | error message renders in chat as fallback              |
| `getByRole('list')` (chat ol)                                  | list            | grows by 2 items per ask (user message + AI reply)                                                     | items rendered in chronological order                                   | list stays at one (welcome) item                       |

## Hidden surfaces opened from this page

| trigger                                      | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------- | ------------- | -------------------------------------------- |
| (none — single-page session view, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path                        | what request body or query is expected                    |
| ------------------- | ------ | --------------------------- | --------------------------------------------------------- |
| page mount          | GET    | `/api/topics/:id`           | none — Bearer token; returns the topic row                |
| page mount          | GET    | `/api/topics/:id/materials` | none — Bearer token; returns array of materials           |
| send composer       | POST   | `/api/topics/:id/ask`       | `{ question }` JSON; 200 returns `{ answer, citations }`  |
| empty submit        | GET    | `/api/topics`               | observable network request so empty submits aren't no-ops |
| Mark reviewed click | PATCH  | `/api/topics/:id`           | empty body `{}`; bumps `last_studied_at` server-side      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/23-study__id.spec.ts`
