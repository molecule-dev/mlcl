# Page observations: /profile (Profile)

Observed via Playwright MCP at `/profile` while authenticated as a fresh
signup. The page is auth-only and shows the user header (initials, name,
email), four KPI cards (published / drafts / bookmarks / spaces), a
"Spaces I maintain" section, and a "Recent articles" section.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                    | role    | expected behavior on interaction                                                                                     | success signal                                        | failure signal                       |
| --------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `getByRole('heading', { level: 1 })` (user name)                                              | heading | Renders the signed-in user's name (or email-local-part fallback) sourced from GET /api/users/me                      | h1 contains the email's local part for a fresh signup | empty heading                        |
| `page.getByText(meEmail)`                                                                     | text    | Renders the authenticated user's email beneath the name                                                              | the email used at signup is visible                   | missing                              |
| `getByRole('link', { name: /edit profile/i })`                                                | link    | Routes the user to /settings                                                                                         | URL changes to /settings                              | nothing happens                      |
| KPI cards "Articles published / Drafts in flight / Articles bookmarked / Spaces you maintain" | text    | Each KPI value is derived from the user's GET /articles + /bookmarks + /spaces fan-out and re-counts after mutations | counts reflect created spaces / articles              | counts stuck at 0 even after creates |
| "Spaces I maintain" list rows                                                                 | link    | Each row is a Link to /spaces/:key for a space the user created                                                      | clicking navigates to the space home with that key    | dead link / 404                      |
| "Recent articles by …" rows (CairnArticleRow)                                                 | link    | Each row links to the article view for one of the user's most recently updated articles                              | clicking opens /article/:id and renders the body      | row missing after creation           |

## Hidden surfaces opened from this page

(none — page is read-only; edits live on /settings and /spaces/new)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected                                               |
| --------- | ------ | -------------- | ------------------------------------------------------------------------------------ |
| Page load | GET    | /api/users/me  | 200 + `{ props: { id, name, email, … } }`                                            |
| Page load | GET    | /api/spaces    | 200 + array of spaces the user can read (used for "Spaces I maintain" + recent rows) |
| Page load | GET    | /api/articles  | 200 + array (filtered locally by author_user_id === me.id)                           |
| Page load | GET    | /api/bookmarks | 200 + paginated envelope; `length` populates the bookmarks KPI                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
