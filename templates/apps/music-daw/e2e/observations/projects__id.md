# Page observations: /projects/:id (Editor)

> Filled from a Playwright MCP walk of the live app. Auth-required.
> Requires a real project id; we create one via API in beforeEach.

## Page state assumed

- [x] Authenticated (sign up, then create a project)

## Elements

| selector / accessible name                                               | role    | expected behavior on interaction                                      | success signal                              | failure signal                    |
| ------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------- | ------------------------------------------- | --------------------------------- |
| `getByRole('link', { name: /all projects/i })`                           | link    | back to `/projects` (top-left)                                        | URL = `/projects`                           | stays on editor                   |
| project name `<h1>` (truncated)                                          | heading | shows the project name we created                                     | h1 text matches name                        | wrong/empty                       |
| BPM/time-sig/duration meta line                                          | text    | "{{bpm}} BPM · {{time_signature}} · 0:00" header strip                | text matches `<bpm> BPM`                    | missing                           |
| `getByRole('link', { name: /open mixer/i })`                             | link    | top-right link → `/projects/:id/mix`                                  | URL becomes `/projects/<id>/mix`            | stays on editor                   |
| toolbar buttons (Select/Pencil/Cut/Zoom/Mute)                            | button  | each sets `aria-pressed=true` for tool selection                      | clicked button has `aria-pressed=true`      | not toggled                       |
| `getByRole('button', { name: /add audio track/i })`                      | button  | POST `/api/tracks` with `type=audio`; track appears in lane list      | new track row visible, `tracks` length +1   | no POST or 4xx                    |
| `getByRole('button', { name: /add MIDI track/i })`                       | button  | POST `/api/tracks` with `type=midi`; track appears in lane list       | new MIDI track row visible                  | no POST                           |
| `getByRole('button', { name: /open piano roll/i })` (after track exists) | button  | POST `/api/clips` then navigates to `/projects/:id/clips/:clipId`     | URL becomes `/projects/<id>/clips/<clipId>` | stays on editor / no clip created |
| empty-tracks placeholder                                                 | text    | "No tracks yet — add your first audio or MIDI lane." when zero tracks | visible on fresh project                    | missing                           |
| anonymous editor                                                         | n/a     | redirect to `/login`                                                  | URL = `/login`                              | renders anonymously               |

## Hidden surfaces opened from this page

| trigger                                                       | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none on editor itself; mixer/piano-roll are separate routes) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger         | method | path                | what request body or query is expected                                                 |
| --------------- | ------ | ------------------- | -------------------------------------------------------------------------------------- |
| initial load    | GET    | `/api/projects/:id` | project meta                                                                           |
| initial load    | GET    | `/api/tracks`       | `?project_id=<id>`                                                                     |
| add audio       | POST   | `/api/tracks`       | `{ project_id, name, type: 'audio' }`                                                  |
| add midi        | POST   | `/api/tracks`       | `{ project_id, name, type: 'midi' }`                                                   |
| open piano roll | GET    | `/api/clips`        | `?track_id=<id>`                                                                       |
| open piano roll | POST   | `/api/clips`        | `{ track_id, kind: 'midi', start_time: 0, duration: 4 }` (only if no midi clip exists) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id.spec.ts`
