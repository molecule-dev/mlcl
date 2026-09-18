# Page observations: /notifications (Notifications)

> Authenticated. Renders 5 seeded notifications from /api/notifications,
> each with a title/body/href deep-link.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role     | expected behavior on interaction                  | success signal | failure signal |
| ------------------------------------ | -------- | ------------------------------------------------- | -------------- | -------------- |
| `getByRole('heading', { level: 1 })` | heading  | renders the page heading                          | visible        | missing        |
| `page.locator('li')`                 | listitem | renders one notification per row                  | ≥1 visible     | empty state    |
| `page.locator('a[href]').first()`    | link     | each notification deep-links to its source entity | href set       | href empty     |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none — feed is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                            | expected body                    |
| --------- | ------ | ------------------------------- | -------------------------------- |
| Page load | GET    | /api/notifications              | array of decorated notifications |
| Page load | GET    | /api/notifications/unread_count | `{ count }`                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-notifications.spec.ts`
