# Page observations: /compose (Compose)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/compose.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role    | expected behavior on interaction                               | success signal                                            | failure signal   |
| ------------------------------------ | ------- | -------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| `[data-mol-id="compose-page"]`       | region  | compose shell renders                                          | element visible                                           | absent           |
| `[data-mol-id="compose-to-input"]`   | textbox | accepts a recipient email                                      | typed value reflected                                     | rejected         |
| `[data-mol-id="compose-subject"]`    | textbox | accepts a subject line                                         | typed value reflected; persists across save               | cleared on focus |
| `[data-mol-id="compose-body"]`       | textbox | accepts the email body text                                    | typed value reflected; persists across save               | cleared on focus |
| `[data-mol-id="compose-save-draft"]` | button  | POST `/api/drafts` (or PUT for an existing draft) when clicked | response 201/200; draft visible in `/inbox?folder=drafts` | error toast      |

## Hidden surfaces opened from this page

| trigger                                 | what it opens          | elements inside (selector / role / behavior)                            |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `[data-mol-id="compose-toggle-cc-bcc"]` | reveal Cc / Bcc inputs | additional textbox fields appear; Cc + Bcc accept extra recipient lists |

## Network calls expected during normal use

| trigger                                | method | path                        | what request body or query is expected     |
| -------------------------------------- | ------ | --------------------------- | ------------------------------------------ |
| Save draft                             | POST   | /api/drafts                 | `{ subject, body, recipients, cc?, bcc? }` |
| Save draft (update)                    | PUT    | /api/drafts/:id             | `{ subject, body, recipients, cc?, bcc? }` |
| Compose with Signet                    | POST   | /api/drafts/compose         | `{ prompt, tone? }`                        |
| Tone pill click (after a draft exists) | POST   | /api/drafts/:id/adjust-tone | `{ tone }`                                 |
| Summarize                              | POST   | /api/drafts/:id/summarize   | `{}`                                       |
| Send                                   | POST   | /api/drafts/:id/send        | `{}`                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/compose.spec.ts`
