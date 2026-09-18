# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name    | role   | expected behavior on interaction        | success signal               | failure signal |
| ----------------------------- | ------ | --------------------------------------- | ---------------------------- | -------------- |
| Heading "What is new for you" | text   | Renders activity feed title             | visible heading              | missing        |
| Filter button "All"           | button | Sets filter to all kinds                | button reflects active state | inert          |
| Filter button "Comments"      | button | Filters to kind=comment                 | rows filtered                | inert          |
| Notification row              | list   | Renders one entry per derived event     | row count matches API        | missing rows   |
| Empty state                   | text   | Renders when feed is empty for new user | "all caught up" visible      | crash on empty |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/notifications | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-notifications.spec.ts`
