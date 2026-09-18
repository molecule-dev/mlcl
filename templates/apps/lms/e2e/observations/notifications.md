# Page observations: /notifications (Notifications feed)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                    | role      | expected behavior on interaction                                                                                         | success signal                  | failure signal                        |
| --------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------- |
| `getByRole('heading', { name: /^Notifications$/i, level: 1 })`                                | heading   | renders page title                                                                                                       | heading visible                 | absent                                |
| `[data-mol-id="notifications-empty"]` OR `[data-mol-id="notifications-list"]` OR welcome card | text/list | shows the empty-state copy for a fresh user, OR a list of upcoming/overdue assignment notifications, OR the welcome card | one of the three states present | none of them present                  |
| `[data-mol-id="page-notifications"]`                                                          | landmark  | top-level main landmark                                                                                                  | element exists                  | DOM has no notifications page wrapper |

## Hidden surfaces opened from this page

| trigger                      | what it opens                              | elements inside (selector / role / behavior) |
| ---------------------------- | ------------------------------------------ | -------------------------------------------- |
| Click notification item link | navigates to the linked course detail page | URL becomes /course/:id                      |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected                                   |
| --------- | ------ | -------------------- | ------------------------------------------------------------------------ |
| Page load | GET    | /api/courses?my=true | none — populates the user's enrolled course list to derive notifications |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
