# Page observations: /notifications

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/notifications. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role                               | expected behavior on interaction          | success signal                | failure signal                |
| ------------------------------------------------------------ | ---------------------------------- | ----------------------------------------- | ----------------------------- | ----------------------------- |
| `[data-mol-id="page-notifications"]`                         | main                               | wraps the notifications surface           | visible after login           | not present                   |
| `getByRole('heading', { level: 1, name: /notifications/i })` | heading                            | renders title                             | visible                       | missing                       |
| `getByText(/loading/i)` (loading state)                      | text                               | shown while fetch in flight               | absent after networkidle      | persists                      |
| `getByText(/all caught up                                    | no notifications/i)` (empty state) | text                                      | empty-state for new accounts  | visible when items.length===0 | hidden when populated |
| `ul li[data-notification-kind="comment"]`                    | listitem                           | comment notification renders body snippet | visible after seeded comment  | not rendered                  |
| `ul li[data-notification-kind="reaction"]`                   | listitem                           | reaction (clap) notification renders      | visible after seeded clap     | not rendered                  |
| `ul li[data-notification-kind="bookmark"]`                   | listitem                           | bookmark notification renders             | visible after seeded bookmark | not rendered                  |
| `time[datetime]` (timestamps)                                | time                               | renders createdAt as locale string        | visible per item              | missing                       |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside |
| ------------------ | ------------- | --------------- |
| (none — flat list) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected                                           |
| --------- | ------ | ------------------ | -------------------------------------------------------------------------------- |
| page load | GET    | /api/notifications | returns array of {id, kind, body?, type?, resourceType?, resourceId?, createdAt} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
