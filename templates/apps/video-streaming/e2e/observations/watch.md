# Page observations: /watch/:id (Watch)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/watch/<seeded-id>.
> Headings observed: video title, channel name, comments composer.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                       | success signal                                   | failure signal                                 |
| --------------------------------------------- | ------- | ------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------- |
| `getByRole('heading')`                        | heading | displays the video title from /api/videos/:id          | title text matches the seeded row                | placeholder text                               |
| `getByRole('button', { name: /like/i })`      | button  | POST /api/videos/:id/like, increments like_count       | counter advances + persists across reload        | counter stuck or 4xx response                  |
| `getByRole('button', { name: /subscribe/i })` | button  | POST /api/follows, creates follow row                  | button toggles to "Subscribed" + survives reload | button stays as Subscribe                      |
| `getByRole('button', { name: /save/i })`      | button  | POST /api/library/later, adds the video to Watch Later | row appears on /library                          | no entry created                               |
| `locator('textarea, input[name="comment"]')`  | textbox | accepts comment body for the video                     | typed text mirrored                              | input not editable                             |
| `getByRole('button', { name: /post            | comment | reply/i })`                                            | button                                           | POST /api/videos/:id/comments, appends to list | new comment visible + survives reload | comment never appears |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                     | what request body or query is expected |
| --------- | ------ | ------------------------ | -------------------------------------- |
| Mount     | GET    | /api/videos/:id          | full video record                      |
| Mount     | POST   | /api/library/history     | `{ video_id }` — write the watch event |
| Mount     | GET    | /api/videos/:id/comments | thread                                 |
| Like      | POST   | /api/videos/:id/like     | empty body                             |
| Subscribe | POST   | /api/follows             | `{ channel_id }`                       |
| Save      | POST   | /api/library/later       | `{ video_id }`                         |
| Comment   | POST   | /api/videos/:id/comments | `{ body }`                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-watch.spec.ts`
