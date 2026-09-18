# Page observations: /integrations (Integrations)

> Authenticated. Lists 5 integrations grouped by category (Calendar +
> Video). Each card has a Connect/Disconnect toggle that PATCHes
> /api/users/:id with `oauthData.integrations[key].connected = true|false`
> and a connectedAt stamp on connect.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role        | expected behavior on interaction                                                  | success signal                                                                  | failure signal |
| -------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------- |
| `getByRole('heading', { name: /integrations/i })`                    | heading     | identifies the page                                                               | h1 visible                                                                      | empty page     |
| `page.locator('[data-mol-id="integration-card-google_calendar"]')`   | card        | renders the Google Calendar integration card                                      | element visible                                                                 | card missing   |
| `page.locator('[data-mol-id="integration-toggle-google_calendar"]')` | button      | toggles google_calendar connected/disconnected; persists via PATCH /api/users/:id | data-status flips to `connected`/`disconnected`; oauthData.integrations updated | error toast    |
| `page.locator('[data-mol-id="integration-card-zoom"]')`              | card        | renders Zoom integration card                                                     | element visible                                                                 | card missing   |
| `page.locator('[data-mol-id="integration-card-outlook"]')`           | card        | renders Outlook integration card                                                  | element visible                                                                 | card missing   |
| `page.locator('[data-mol-id="integration-card-teams"]')`             | card        | renders Teams integration card                                                    | element visible                                                                 | card missing   |
| `page.locator('[data-mol-id="nav-integrations"]')`                   | sidebar nav | sidebar shell rendered                                                            | element visible                                                                 | layout broken  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger       | method | path           | what request body or query is expected                                   |
| ------------- | ------ | -------------- | ------------------------------------------------------------------------ |
| Page load     | GET    | /api/users/:id | returns persisted `oauthData.integrations`                               |
| Toggle a card | PATCH  | /api/users/:id | `{ oauthData: { integrations: { [key]: { connected, connectedAt } } } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/19-integrations.spec.ts`
