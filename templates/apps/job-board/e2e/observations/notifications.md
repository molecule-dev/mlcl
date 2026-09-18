# Page observations: /notifications (Notifications)

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                         | role                  | expected behavior on interaction | success signal                  | failure signal                        |
| ------------------------------------------------------------------ | --------------------- | -------------------------------- | ------------------------------- | ------------------------------------- |
| Page heading `getByRole('heading')` first                          | heading               | shows the notifications header   | rendered                        | missing                               |
| Empty state `getByText(/no\s*notifications                         | all\s*caught\s*up/i)` | status                           | shown when nothing is unread    | text visible on a fresh signup        | absent |
| Mark-all-read button `getByRole('button', { name: /mark.*all.*read | read.*all/i })`       | button                           | PUT /api/notifications/read-all | button disables / unread badge clears | 4xx    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected |
| ------- | ------ | ------------------ | -------------------------------------- |
| mount   | GET    | /api/notifications | unread-first list                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
