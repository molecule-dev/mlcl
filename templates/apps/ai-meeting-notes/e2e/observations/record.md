# Page observations: /record (Record)

> Authenticated. Browser-side MediaRecorder captures mic audio, then
> POSTs the Blob to /api/meetings/transcribe (Whisper + Claude pipeline).
> Successful upload navigates to /meetings/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                        | role                 | expected behavior on interaction                | success signal                                                 | failure signal                    |
| --------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| `getByRole('heading', { name: /^record$/i })`                                     | heading              | identifies the page                             | h1 visible                                                     | empty page                        |
| `getByLabel(/meeting-title                                                        | meeting title/i)`    | textbox                                         | optional title — sent as X-Meeting-Title header                | input value updates               | input read-only     |
| `getByRole('button', { name: /start-recording                                     | stop-recording/i })` | button                                          | starts MediaRecorder when idle, stops + uploads when recording | aria-pressed flips, label changes | error state visible |
| `page.locator('button[aria-label="start-recording"] .material-symbols-outlined')` | icon                 | mic glyph when idle                             | visible in idle                                                | wrong glyph                       |
| `page.locator('button[aria-label="stop-recording"]')`                             | button               | active stop button (only present mid-recording) | visible when state="recording"                                 | never appears                     |
| `getByRole('timer')`                                                              | timer                | shows elapsed time mm:ss while recording        | text updates each second                                       | timer absent                      |
| `page.locator('[data-mol-id="nav-record"]')`                                      | sidebar nav          | sidebar shell rendered                          | element visible                                                | layout broken                     |

## Hidden surfaces opened from this page

| trigger                             | what it opens      | elements inside                                     |
| ----------------------------------- | ------------------ | --------------------------------------------------- |
| Click stop while recording          | "processing" state | spinner glyph, "Transcribing with Whisper…" message |
| Click record without mic permission | error state        | error message + "Try again" button                  |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected                                                             |
| -------------- | ------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Stop recording | POST   | /api/meetings/transcribe | raw audio bytes; X-Meeting-Title header; 201 with `{ meeting_id, summary_md, action_items_count }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-record.spec.ts`
