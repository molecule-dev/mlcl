# Page observations: /spaces (SpacesIndex)

Observed via Playwright MCP at `/spaces` while authenticated as a fresh
signup. Renders an empty state for fresh users and a 1–3 column grid of
CairnSpaceCards once spaces exist. Header has a "New space" CTA.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role                | expected behavior on interaction                                   | success signal                                                               | failure signal                |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------- |
| `getByRole('heading', { level: 1, name: /spaces/i })`     | heading             | Renders the page title for the index                               | h1 "Spaces" visible                                                          | empty / wrong text            |
| `getByRole('link', { name: /new space/i })` (header CTA)  | link                | Routes to /spaces/new                                              | URL becomes /spaces/new and the New Space form mounts                        | nothing happens               |
| Empty-state heading "No spaces yet" + body copy           | heading + paragraph | Visible only when GET /spaces returns an empty array for this user | both visible on a fresh signup                                               | shown after spaces exist      |
| `getByRole('link', { name: /create your first space/i })` | link                | Empty-state CTA links to /spaces/new                               | URL becomes /spaces/new                                                      | dead link                     |
| Space cards (one per space the user can read)             | link                | Each CairnSpaceCard is a link to /spaces/:key for that space       | clicking navigates to the space home; SpaceHome lists articles in that space | cards missing or 404 on click |
| Article-count badge inside each space card                | text                | Derived locally from GET /api/articles count grouped by space_id   | count reflects articles in that space                                        | always 0                      |

## Hidden surfaces opened from this page

(none — index has no menus or modals; everything lives in nested routes)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                                | method | path                 | what request body or query is expected                        |
| -------------------------------------- | ------ | -------------------- | ------------------------------------------------------------- |
| Page load                              | GET    | /api/spaces          | 200 + array of spaces the user can read                       |
| Page load                              | GET    | /api/articles        | 200 + array, used to compute per-space article counts         |
| Submit New Space form (on /spaces/new) | POST   | /api/spaces          | `{ key, name, description }` → 201; navigates to /spaces/:key |
| Open a card → SpaceHome                | GET    | /api/spaces/:idOrKey | 200 with the space's metadata + articles in it                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/spaces.spec.ts`
