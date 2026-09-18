# Page observations: /messages (Messages)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name               | role    | expected behavior on interaction        | success signal                              | failure signal        |
| ---------------------------------------- | ------- | --------------------------------------- | ------------------------------------------- | --------------------- |
| heading "Threads with your tutors."      | heading | page header                             | visible                                     | missing               |
| Thread sidebar list                      | aside   | renders threads                         | rows appear after first message             | empty-state when none |
| Empty-state copy ("No threads yet")      | text    | shown when threads array empty          | visible for fresh user                      | absent for empty list |
| `getByRole('textbox')` (message input)   | textbox | accepts message draft                   | value typed                                 | rejected              |
| `getByRole('button', { name: /send/i })` | button  | POST /api/messages/threads/:id/messages | new bubble appears + persists across reload | error inline          |
| Thread row click                         | button  | switches active thread + GET messages   | message panel updates                       | no switch             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                                     | what request body or query is expected              |
| ------------- | ------ | ---------------------------------------- | --------------------------------------------------- |
| page load     | GET    | /api/messages/threads                    | returns thread list                                 |
| ?with= param  | POST   | /api/messages/threads                    | { recipient_id } creates or returns existing thread |
| switch thread | GET    | /api/messages/threads/:threadId/messages | returns messages                                    |
| send          | POST   | /api/messages/threads/:threadId/messages | { body }                                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages.spec.ts`
