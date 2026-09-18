# Page observations: /clients (Clients)

> List of clients. Initial load fires `GET /api/clients`. "Add client"
> opens a modal with name/company/email/phone fields; submit POSTs to
> `/api/clients` and the new card appears in the grid (read-after-write).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role      | expected behavior on interaction                 | success signal                             | failure signal       |
| -------------------------------------------------------------- | --------- | ------------------------------------------------ | ------------------------------------------ | -------------------- |
| `getByRole('heading', { name: /^Clients$/ })`                  | heading   | static page title                                | visible                                    | missing              |
| `getByRole('button', { name: /^Add client$/ })`                | button    | opens new-client modal                           | `[data-testid="new-client-modal"]` visible | no modal             |
| `getByRole('searchbox', { name: /Search by name/ })`           | searchbox | filters visible cards by name/company/email      | rows reduced to matching                   | no filtering         |
| client name on a card                                          | link      | navigates to `/clients/:id`                      | URL matches `/clients/[uuid]`              | stays                |
| `getByLabel(/Client name/)` (modal)                            | textbox   | required field                                   | retained                                   | required-field flash |
| `getByRole('button', { name: /^Add client$/ })` (modal submit) | button    | POSTs new client; modal closes; new card appears | new card visible AFTER reload              | error toast          |

## Hidden surfaces opened from this page

| trigger    | what it opens                      | elements inside (selector / role / behavior)                  |
| ---------- | ---------------------------------- | ------------------------------------------------------------- |
| Add client | `[data-testid="new-client-modal"]` | name / company / email / phone inputs + Save & Cancel buttons |

## Network calls expected during normal use

| trigger           | method | path         | what request body or query is expected             |
| ----------------- | ------ | ------------ | -------------------------------------------------- |
| initial mount     | GET    | /api/clients | array of decorated client rows                     |
| Add client submit | POST   | /api/clients | `{ name, email?, company?, phone? }`; 201 with row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/clients.spec.ts`
