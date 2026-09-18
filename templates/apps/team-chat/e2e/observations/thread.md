# Page observations: /channels/:channelId/threads/:messageId (ThreadPage)

> Filled from a live walk via Playwright MCP at /channels/<id>/threads/<id> (signed-in).

## Page state assumed

- [x] Authenticated (AuthGuard route)

## Elements

| selector / accessible name         | role    | expected behavior on interaction                                             | success signal                                                                                       | failure signal                                |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `[data-mol-id=thread-not-found]`   | section | shown when the parent message id is invalid                                  | "Thread not found." copy renders                                                                     | hardcoded "Alex Chen" sample is shown instead |
| `[data-mol-id=thread-parent]`      | section | shown when GET /api/messages/:id returns a row; renders sender + content     | parent message content matches the seeded message                                                    | empty / fallback sample                       |
| `[data-mol-id=thread-replies]`     | list    | renders all replies returned by GET /api/threads/:messageId/replies          | all seeded replies visible                                                                           | empty when replies exist                      |
| `[data-mol-id=thread-reply-input]` | textbox | bound to `newReply` state, accepts text                                      | typed value reflected                                                                                | rejects                                       |
| `[data-mol-id=thread-reply-send]`  | button  | POST /api/threads/:messageId/replies with `{ content }`; appends row to feed | new reply renders in `[data-mol-id=thread-replies]`; GET /api/threads/:messageId/replies reflects it | duplicate / 4xx / no append                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                            | what request body or query is expected          |
| ---------- | ------ | ------------------------------- | ----------------------------------------------- |
| Page load  | GET    | /api/messages/:messageId        | returns parent message row (or 404 → not found) |
| Page load  | GET    | /api/threads/:messageId/replies | returns array of reply rows                     |
| Send reply | POST   | /api/threads/:messageId/replies | `{ content }` returns inserted reply            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/thread.spec.ts`
