# Page observations: /compose (Compose)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role            | expected behavior on interaction                     | success signal                                                      | failure signal                                   |
| ------------------------------------------------------ | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `[data-mol-id="compose-to-input"]`                     | textbox (email) | accept recipient + add chip on Enter                 | recipient chip rendered with `data-mol-id="compose-recipient-chip"` | recipient ignored, no chip                       |
| `[data-mol-id="compose-subject"]`                      | textbox         | accept subject text                                  | value reflects typed text                                           | empty value                                      |
| `[data-mol-id="compose-body"]`                         | textarea        | accept message body                                  | value reflects typed text                                           | empty body                                       |
| `[data-mol-id="compose-send"]`                         | button          | POST /api/emails/send with to/subject/body           | navigates to /sent or /inbox; row in /sent                          | error message in `[data-mol-id="compose-error"]` |
| `[data-mol-id="compose-discard"]`                      | button          | DELETE active draft (if any) and navigate to /drafts | URL becomes /drafts                                                 | nothing happens                                  |
| Auto-save indicator (`[data-mol-id="compose-saving"]`) | status          | shows "Saved" after debounce                         | "Saved" / timestamp visible after typing                            | indicator never updates                          |
| `[data-mol-id="compose-back"]`                         | link            | navigate back to /inbox                              | URL becomes /inbox                                                  | stays on /compose                                |

## Hidden surfaces opened from this page

| trigger       | what it opens                    | elements inside (selector / role / behavior) |
| ------------- | -------------------------------- | -------------------------------------------- |
| Cc/Bcc toggle | reveals `compose-cc-input` field | additional recipient field rendered          |

## Network calls expected during normal use

| trigger              | method | path             | what request body or query is expected |
| -------------------- | ------ | ---------------- | -------------------------------------- |
| Auto-save (typing)   | POST   | /api/drafts      | { to, subject, body }                  |
| Auto-save subsequent | PUT    | /api/drafts/:id  | { to, subject, body }                  |
| Send                 | POST   | /api/emails/send | { to, subject, body, thread_id }       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/compose.spec.ts`
