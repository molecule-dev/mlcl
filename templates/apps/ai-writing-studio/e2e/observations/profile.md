# Page observations: /profile (Profile)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction              | success signal                        | failure signal         |
| -------------------------------------------------------------- | ------- | --------------------------------------------- | ------------------------------------- | ---------------------- |
| `getByRole('heading', { level: 1 })` (writer name)             | heading | renders the writer's name from `/api/profile` | h1 contains the user's signed-up name | h1 stays at "Loading…" |
| `getByText(/^Published$/i).first()` (stat)                     | text    | published-count stat tile renders             | tile visible                          | tile missing           |
| `getByText(/^Drafts$/i)` (stat)                                | text    | drafts-count stat tile renders                | tile visible                          | tile missing           |
| `getByText(/^Total$/i)` (stat)                                 | text    | total-count stat tile renders                 | tile visible                          | tile missing           |
| `getByRole('heading', { name: /Published works/i, level: 2 })` | heading | published-works section renders               | h2 visible                            | section missing        |
| `getByText(/No published documents yet/i)` (when empty)        | text    | empty-state copy for fresh user               | copy visible                          | empty-state missing    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path         | what request body or query is expected              |
| -------------- | ------ | ------------ | --------------------------------------------------- |
| initial render | GET    | /api/profile | returns `{ name, handle, email, stats, published }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
