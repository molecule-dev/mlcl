# Page observations: /decks

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role          | expected behavior on interaction                                          | success signal                              | failure signal                         |
| -------------------------------------------- | ------------- | ------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| `getByText(/no presentations yet             | untitled deck | presentations/i)`                                                         | text                                        | empty state visible for fresh accounts | visible | missing |
| "New deck" button (sidebar) → `/decks?new=1` | button        | POST /api/presentations and redirect to /decks/:id/edit                   | 201 + URL becomes /decks/<uuid>/edit        | no POST fired                          |
| existing deck card                           | link          | navigates to /decks/:id/edit when clicked                                 | URL becomes /decks/<uuid>/edit              | unchanged                              |
| `?new=1` query                               | page          | auto-creates a deck and routes to editor                                  | redirects to /decks/<uuid>/edit             | stays on /decks                        |
| `?template=pitch-aurora` query               | page          | auto-creates a deck titled "Aurora Pitch"                                 | editor opens; title resolves on next reload | no creation                            |
| Sidebar nav links (7)                        | link          | navigate to /decks /templates /shared /analytics /notifications /settings | each link visible                           | missing                                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/presentations | array of decks owned by the user       |
| New deck     | POST   | /api/presentations | { title }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/decks.spec.ts`
