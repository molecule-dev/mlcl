# Page observations: /saved

> Observed via Playwright at http://localhost:3080/saved — bookmarks page
> rendered by `pages/Saved.tsx`. Empty for fresh users, populated after a
> Save action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role          | expected behavior on interaction | success signal           | failure signal                      |
| ----------------------------------------------------------- | ------------- | -------------------------------- | ------------------------ | ----------------------------------- |
| `getByRole('heading', { name: /saved/i })`                  | heading       | renders the page title           | visible                  | missing                             |
| empty-state copy `getByText(/no saved                       | nothing saved | bookmark/i)`                     | text                     | shown for users with zero bookmarks | visible only when bookmarks=[] | shown when populated |
| Saved story list item `getByRole('link')` for each bookmark | link          | each links to /stories/:id       | URL becomes /stories/:id | broken                              |
| Sidebar `Today` link                                        | link          | navigates back to /home          | URL becomes /home        | unchanged                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected          |
| --------- | ------ | -------------- | ----------------------------------------------- |
| Page load | GET    | /api/bookmarks | list of saved stories with story details joined |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/05-saved-page.spec.ts` (empty + populated)
