# Page observations: /endpoints/:id (EndpointDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated; an endpoint exists (created via UI or `createWebhookViaApi` helper).

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                       | success signal                               | failure signal         |
| --------------------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------- | ---------------------- |
| Endpoint URL header / breadcrumb              | heading | render the endpoint URL/name as the page title         | matches GET /api/webhooks/:id                | wrong record / missing |
| `getByRole('button', { name: /send test/i })` | button  | POST /api/webhooks/:id/test → seeds a delivery row     | next GET /api/deliveries lists the new row   | no delivery created    |
| `getByRole('button', { name: /pause/i })`     | button  | PUT `is_active=false`                                  | next GET shows `is_active=false`             | flag still true        |
| `getByRole('button', { name: /resume/i })`    | button  | PUT `is_active=true`                                   | next GET shows `is_active=true`              | flag still false       |
| `getByRole('button', { name: /delete/i })`    | button  | DELETE /api/webhooks/:id then navigate to `/endpoints` | endpoint gone from list, URL is `/endpoints` | endpoint still listed  |
| Reveal-secret toggle                          | button  | flip masked → plaintext signing secret                 | rendered secret length > masked length       | text unchanged         |

## Hidden surfaces opened from this page

| trigger       | what it opens       | elements inside (selector / role / behavior) |
| ------------- | ------------------- | -------------------------------------------- |
| Delete button | confirmation dialog | confirm/cancel buttons → confirm runs DELETE |

## Network calls expected during normal use

| trigger      | method | path                   | what request body or query is expected      |
| ------------ | ------ | ---------------------- | ------------------------------------------- |
| Page mount   | GET    | /api/webhooks/:id      | hydrate endpoint detail                     |
| Page mount   | GET    | /api/deliveries        | list deliveries for this endpoint           |
| Send test    | POST   | /api/webhooks/:id/test | empty body — server seeds the test delivery |
| Pause/Resume | PUT    | /api/webhooks/:id      | `{ is_active }`                             |
| Delete       | DELETE | /api/webhooks/:id      | (empty body)                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/endpoint-detail.spec.ts`
