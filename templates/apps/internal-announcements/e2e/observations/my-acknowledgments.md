# Page observations: /my-acknowledgments (MyAcknowledgments)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role                                | expected behavior on interaction | success signal                                    | failure signal |
| ------------------------------------------------ | ----------------------------------- | -------------------------------- | ------------------------------------------------- | -------------- |
| `getByTestId("ack-tab-pending")`                 | button                              | shows pending tab                | tab active, list shows announcements awaiting ack | nothing        |
| `getByTestId("ack-tab-acked")`                   | button                              | shows acknowledged tab           | tab active, list shows already-acked              | nothing        |
| `getByTestId("ack-tab-sent")`                    | button                              | shows sent tab                   | tab active, list shows announcements I authored   | nothing        |
| announcement card link                           | link `/announcement/:id`            | navigates to detail              | URL `/announcement/<uuid>`                        | stays          |
| `getByText(/empty                                | no announcements/i)` (empty states) | text                             | shown when list is empty                          | visible        | not present when populated |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })`                      | button                           | logs out                                          | URL `/login`   | unchanged                  |
| `getByRole("button", { name: /Toggle theme/i })` | button                              | flips theme                      | `data-mol-mode` flips                             | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                                    | what request body or query is expected |
| --------- | ------ | --------------------------------------- | -------------------------------------- |
| Page load | GET    | `/api/announcements`                    | list announcements                     |
| Page load | GET    | `/api/announcements/me/acknowledgments` | current user's acks                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/my-acknowledgments.spec.ts`
