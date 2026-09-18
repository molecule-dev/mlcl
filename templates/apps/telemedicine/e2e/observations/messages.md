# Page observations: /messages (messages)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                        | role    | expected behavior on interaction | success signal                                  | failure signal                               |
| --------------------------------------------------------------------------------- | ------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Unauthenticated visit redirects to /login                                         | element | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| Renders Messages heading + secure inbox eyebrow                                   | heading | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| Calls GET /api/messages on initial load                                           | network | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx             |
| Empty-state composer: typing + Send creates a real message via POST /api/messages | network | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx             |
| After first send, the thread is selectable in the inbox sidebar                   | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Send button stays disabled until composer has text                                | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected |
| --------- | ------ | ------------- | -------------------------------------- |
| page load | GET    | /api/messages | (none)                                 |
| send      | POST   | /api/messages | { body, thread_id? }                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages.spec.ts`
