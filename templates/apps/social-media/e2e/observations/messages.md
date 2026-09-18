# Page observations: /messages (Messages)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role     | expected behavior on interaction                        | success signal                          | failure signal       |
| -------------------------------- | -------- | ------------------------------------------------------- | --------------------------------------- | -------------------- |
| Conversation thread row          | listitem | render the most recent thread; click loads its messages | row visible with last message preview   | empty list           |
| Last-message preview text        | text     | reflect the most recent inbound DM body                 | preview text matches the latest message | preview missing      |
| Active thread message list       | region   | render messages newest-last after a thread is selected  | message bubbles visible                 | thread fails to load |
| Reply input (`textarea`/`input`) | textbox  | accept reply text and submit                            | typed value reflected                   | input rejects        |
| Send button                      | button   | POST to `/api/messages/threads/:id/messages`            | new message renders in list             | error toast          |

## Hidden surfaces opened from this page

| trigger          | what it opens       | elements inside (selector / role / behavior) |
| ---------------- | ------------------- | -------------------------------------------- |
| Thread row click | thread detail panel | message list + reply form                    |

## Network calls expected during normal use

| trigger     | method | path                               | what request body or query is expected  |
| ----------- | ------ | ---------------------------------- | --------------------------------------- |
| Page mount  | GET    | /api/messages/threads              | returns `Thread[]` for the viewer       |
| Open thread | GET    | /api/messages/threads/:id/messages | returns `Message[]`                     |
| Send reply  | POST   | /api/messages/threads/:id/messages | `{ content }` returns the saved message |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages.spec.ts`
