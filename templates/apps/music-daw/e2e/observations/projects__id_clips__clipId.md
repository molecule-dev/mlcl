# Page observations: /projects/:id/clips/:clipId (PianoRoll)

> Filled from a Playwright MCP walk of the live app. Auth-required.
> Requires a project + track + midi clip id; we provision via API in setup.

## Page state assumed

- [x] Authenticated (sign up, then create project + track + midi clip)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                                | success signal                                                 | failure signal                 |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `getByRole('link', { name: /^Arrangement$/i })`       | link    | back to `/projects/:id` (top-left)                                              | URL = `/projects/<id>`                                         | stays                          |
| `getByRole('heading', { name: /Piano roll/i })`       | heading | "Piano roll · {{count}} notes" header                                           | visible                                                        | missing                        |
| bars/steps meta line                                  | text    | "{{bars}} bars · {{steps}} steps · 1/16 grid"                                   | visible                                                        | missing                        |
| grid `role="button"` aria-label "Click to add a note" | button  | clicking inside the grid POSTs `/api/midi-notes` and renders the new note       | clip note count increments, GET clip returns new midi_note row | no POST or note doesn't render |
| existing note (button per midi note)                  | button  | clicking an existing note DELETEs it via `/api/midi-notes/:id`, removes from UI | note disappears, GET clip returns one fewer                    | not deleted                    |
| velocity lane (bottom strip)                          | n/a     | renders one bar per note; shows velocity height                                 | bars visible after adding note                                 | empty after add                |
| clip-missing fallback                                 | alert   | when `:clipId` is invalid, page shows error panel with back link                | red alert visible                                              | crashes                        |

## Hidden surfaces opened from this page

| trigger | what it opens                        | elements inside (selector / role / behavior) |
| ------- | ------------------------------------ | -------------------------------------------- |
| (none)  | piano roll is one canvas-like screen | n/a                                          |

## Network calls expected during normal use

| trigger             | method | path                  | what request body or query is expected                    |
| ------------------- | ------ | --------------------- | --------------------------------------------------------- |
| initial load        | GET    | `/api/clips/:id`      | clip with `midi_notes` array                              |
| grid click          | POST   | `/api/midi-notes`     | `{ clip_id, pitch, velocity: 100, start, duration: 0.5 }` |
| existing-note click | DELETE | `/api/midi-notes/:id` | empty body, returns 200/204                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id_clips__clipId.spec.ts`
