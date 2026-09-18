# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                       | success signal         | failure signal  |
| -------------------------------------------------------- | ------- | ------------------------------------------------------ | ---------------------- | --------------- |
| `getByRole("heading", { name: /notification\|inbox/i })` | heading | render page title                                      | visible                | absent          |
| notification list                                        | list    | render the seeded notifications (3 on first load)      | rows visible           | empty / loading |
| mark-all-read button                                     | button  | POST /api/notifications/read-all → all rows .read=true | all rows visually read | unchanged       |
| per-row mark-read                                        | button  | PUT /api/notifications/:id/read → row.read=true        | that row visually read | unchanged       |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                        | what request body or query is expected |
| -------------- | ------ | --------------------------- | -------------------------------------- |
| page load      | GET    | /api/notifications          | (list)                                 |
| mark-all click | POST   | /api/notifications/read-all | {}                                     |
| per-row click  | PUT    | /api/notifications/:id/read | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
