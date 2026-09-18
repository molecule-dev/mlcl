# Page observations: /notifications (Notifications)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/notifications.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/notifications`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role   | expected behavior on interaction         | success signal                             | failure signal                  |
| ---------------------------------------------------- | ------ | ---------------------------------------- | ------------------------------------------ | ------------------------------- |
| Notification list rows                               | list   | shows seeded notifications, unread first | at least one row visible with unread badge | empty / error                   |
| `getByRole('button', { name: /mark all as read/i })` | button | POST /api/notifications/read-all         | every row flips to read; unread count → 0  | request fails / count unchanged |

## Hidden surfaces opened from this page

(none; all interaction is inline)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger          | method | path                        | what request body or query is expected |
| ---------------- | ------ | --------------------------- | -------------------------------------- |
| initial mount    | GET    | /api/notifications          | (authenticated bearer)                 |
| Mark all as read | POST   | /api/notifications/read-all | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
