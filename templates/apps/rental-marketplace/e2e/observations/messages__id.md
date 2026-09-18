# Page observations: /messages/:id (Message Thread)

Single conversation view: header with peer name, day-grouped messages
list, and a sticky pill-shaped reply form at the bottom that POSTs new
messages and refreshes the thread.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seeds one host thread)

## Elements

| selector / accessible name                                                              | role   | expected behavior on interaction                                               | success signal                               | failure signal         |
| --------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ | -------------------------------------------- | ---------------------- |
| Reply input `getByPlaceholder(/Reply/i)`                                                | input  | type a message body                                                            | input accepts text                           | input not editable     |
| Send button `getByRole('button', { name: /send/i })`                                    | button | POST /api/messages/threads/:id with { body }; subsequent GET shows new message | new message visible at bottom; input cleared | error / no new message |
| `getByRole('link', { name: /view listing/i })`                                          | link   | navigate to /listings/:listing_id                                              | URL becomes /listings/<uuid>                 | no navigation          |
| Back-to-inbox fallback `getByRole('link', { name: /back to inbox/i })` (when not found) | link   | navigate to /messages                                                          | URL becomes /messages                        | broken                 |
| Day-grouped message bubble                                                              | text   | renders self/other messages with timestamp                                     | bubble shows body + time                     | layout broken          |

## Hidden surfaces opened from this page

(none — single conversation panel)

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected  |
| ------------- | ------ | ------------------------- | --------------------------------------- |
| initial mount | GET    | /api/messages/threads/:id | 200 with `{ thread, messages }` payload |
| send          | POST   | /api/messages/threads/:id | { body } → 200/201 with the new message |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages__id.spec.ts`
