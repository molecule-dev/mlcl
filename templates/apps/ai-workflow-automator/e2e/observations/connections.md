# Page observations: /connections

> Authenticated connections catalog. Lists known integrations (Slack,
> Gmail, Notion, …) and shows status from /api/connections.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role       | expected behavior on interaction | success signal           | failure signal |
| ------------------------------------ | ---------- | -------------------------------- | ------------------------ | -------------- |
| `getByRole("heading", { level: 1 })` | heading    | page heading visible             | visible                  | empty          |
| `getByText(/slack/i)`                | label      | Slack integration row visible    | visible                  | absent         |
| `getByText(/gmail                    | google/i)` | label                            | Gmail/Google row visible | visible        | absent |
| `getByText(/notion/i)`               | label      | Notion integration row visible   | visible                  | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path             | expected body                   |
| --------- | ------ | ---------------- | ------------------------------- |
| page load | GET    | /api/connections | [ { id, provider, status, … } ] |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-connections.spec.ts`
