# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role     | expected behavior on interaction                           | success signal                                    | failure signal          |
| -------------------------------------------------------------- | -------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------- |
| `getByRole('heading', { name: /^Notifications$/i, level: 1 })` | heading  | renders page title                                         | heading visible                                   | absent                  |
| `getByRole('button', { name: /Mark all as read/i })`           | button   | POST /api/notifications/read-all, clears unread count      | request fires; rows still visible but marked read | request 4xx/5xx         |
| `getByRole('listitem')` (notification rows)                    | listitem | shows notification entries with heading + body + timestamp | ≥1 row visible with full content                  | empty list              |
| notification link `a[href]`                                    | link     | navigate to relevant page                                  | URL changes                                       | stays on /notifications |
| backend invariant: read-all clears all unread                  | API      | after POST /api/notifications/read-all every row is read   | no row has is_read=false                          | unread row remains      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                  | method | path                        | what request body or query is expected |
| ------------------------ | ------ | --------------------------- | -------------------------------------- |
| Page load                | GET    | /api/notifications          | none                                   |
| Click "Mark all as read" | POST   | /api/notifications/read-all | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
