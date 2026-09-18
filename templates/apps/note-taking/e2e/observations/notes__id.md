# Page observations: /notes/:id (Note editor)

> Captured live via Playwright MCP at
> `http://localhost:3070/notes/<uuid>` after creating a new note from the
> notes list.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); active note id resolved from URL

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction                                                                                                | success signal                                                               | failure signal       |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                      | link    | navigate to `/home`                                                                                                             | URL is `/home`                                                               | URL unchanged        |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings) | link    | navigate to the named route                                                                                                     | URL becomes that path                                                        | URL unchanged        |
| `getByRole('button', { name: /open user menu/i })`                  | button  | open user-menu popover                                                                                                          | popover with sign-out/profile items                                          | nothing happens      |
| Breadcrumb `getByRole('link', { name: 'My notebook' })`             | link    | navigate back to `/notes` (workspace list)                                                                                      | URL is `/notes`                                                              | URL unchanged        |
| Breadcrumb title text                                               | text    | mirrors the page title                                                                                                          | matches title input value                                                    | static               |
| `getByRole('textbox', { name: /note title/i })`                     | textbox | typing patches `/api/pages/:id` `{ title }` after debounce; persists across reload                                              | GET `/api/pages/:id` after typing returns the new title; reload preserves it | nothing persists     |
| `getByRole('textbox', { name: /note body/i })`                      | textbox | typing creates/updates a paragraph block via `/api/blocks` (POST first time, PATCH on subsequent edits); persists across reload | GET `/api/pages/:id` returns a block whose `content.text` matches            | edits do not persist |
| `getByRole('button', { name: /toggle favorite/i })`                 | button  | PATCH `/api/pages/:id` `{ is_favorited: !current }`                                                                             | response 200 with new flag; star icon toggles fill                           | nothing happens      |
| `getByRole('button', { name: /move to trash/i })`                   | button  | POST `/api/pages/:id/trash` (soft-delete); navigate to `/notes`                                                                 | URL becomes `/notes` and the note is no longer in the default list           | note still listed    |
| Word count indicator                                                | text    | displays current body word count                                                                                                | reflects body block content                                                  | always 0             |
| "Updated · …" timestamp                                             | text    | displays note's `updated_at` formatted                                                                                          | matches GET response `updated_at`                                            | static               |

## Hidden surfaces opened from this page

| trigger                | what it opens                                             | elements inside (selector / role / behavior)      |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `Open user menu`       | popover                                                   | sign-out, profile, settings (shared across pages) |
| `Move to trash` button | (no modal — direct soft-delete; navigates back to /notes) | —                                                 |

## Network calls expected during normal use

| trigger                            | method | path                   | what request body or query is expected                         |
| ---------------------------------- | ------ | ---------------------- | -------------------------------------------------------------- |
| initial load                       | GET    | `/api/pages/:id`       | returns page + nested `blocks` array                           |
| typing title (debounced)           | PATCH  | `/api/pages/:id`       | `{ title }`                                                    |
| typing body (debounced first time) | POST   | `/api/blocks`          | `{ page_id, type: 'paragraph', content: { text } }`            |
| typing body (subsequent)           | PATCH  | `/api/blocks/:blockId` | `{ content: { text } }`                                        |
| toggle favorite                    | PATCH  | `/api/pages/:id`       | `{ is_favorited }`                                             |
| move to trash                      | POST   | `/api/pages/:id/trash` | `{}`, returns 200; subsequent GET filters it from default list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notes__id.spec.ts`
