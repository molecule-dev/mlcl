# Page observations: /clients/:id (ClientDetail)

> Per-client detail. Loads `GET /api/clients/:id`, then
> `GET /api/invoices?client_id=:id` to render the invoice history. Also
> shows contact card and recent activity tied to the client.

## Page state assumed

- [x] Authenticated (sign up first; navigate from /clients to a real id)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                 | success signal                              | failure signal     |
| ------------------------------------------------ | ------- | ------------------------------------------------ | ------------------------------------------- | ------------------ |
| `getByRole('link', { name: /Back to clients/ })` | link    | navigates to `/clients`                          | URL ends `/clients`                         | stays              |
| `getByRole('heading', level: 1)` (client name)   | heading | shows the client's display name from API         | matches the seeded/created name             | shows '—' or empty |
| `getByText(/Invoice history/)`                   | heading | section listing invoices fetched for this client | at least one demo invoice visible if seeded | empty section      |
| `getByText(/Contact/)`                           | heading | shows contact info (email/phone/company)         | matches what client API returned            | empty              |
| `getByText(/Recent activity/)`                   | heading | activity feed scoped to client                   | shows items or empty-state message          | error              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected |
| ------------- | ------ | --------------------------- | -------------------------------------- |
| initial mount | GET    | /api/clients/:id            | decorated client row                   |
| initial mount | GET    | /api/invoices?client_id=:id | array of invoices for this client      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/clients__id.spec.ts`
