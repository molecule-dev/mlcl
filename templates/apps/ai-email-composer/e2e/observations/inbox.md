# Page observations: /inbox (Inbox)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/inbox.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                                   | role   | expected behavior on interaction                                      | success signal                                                                   | failure signal             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| `[data-mol-id="inbox-page"]`                                                                                                                                 | region | inbox shell renders after auth                                        | element visible                                                                  | absent                     |
| `[data-mol-id="inbox-folder-drafts"]`, `[data-mol-id="inbox-folder-sent"]`, `[data-mol-id="inbox-folder-archive"]`, `[data-mol-id="inbox-folder-scheduled"]` | tab    | clicking each folder updates URL `?folder=<key>` and the visible list | URL `folder=` query reflects clicked tab; empty-state message changes per folder | folder click no-op         |
| `[data-mol-id="inbox-empty"]`                                                                                                                                | text   | empty-state message visible for a fresh user with no drafts/sent      | element visible                                                                  | persists after a real send |
| `[data-mol-id="inbox-count"]`                                                                                                                                | text   | folder counter reflects rows in the active folder                     | numeric counter visible (`0` for fresh user)                                     | absent                     |

## Hidden surfaces opened from this page

| trigger                                      | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------- | ------------- | -------------------------------------------- |
| (none — folders are inline tabs, not modals) | —             | —                                            |

## Network calls expected during normal use

| trigger                    | method | path                         | what request body or query is expected |
| -------------------------- | ------ | ---------------------------- | -------------------------------------- |
| mount                      | GET    | /api/drafts                  | (none)                                 |
| mount                      | GET    | /api/sent-emails             | (none)                                 |
| archive draft (row action) | POST   | /api/drafts/:id/archive      | `{ archived: true }`                   |
| archive sent (row action)  | POST   | /api/sent-emails/:id/archive | `{ archived: true }`                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/inbox.spec.ts`
