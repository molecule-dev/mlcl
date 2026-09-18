# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                                                                    | success signal                                                                | failure signal                       |
| --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `getByRole('heading', { name: /^Settings$/i, level: 1 })` | heading | renders page heading after auth bootstrap                                                           | heading visible                                                               | redirect to /login                   |
| `[data-mol-id="settings-section-account"]`                | section | the Account card with Display name / Email / Timezone rows                                          | section is visible AND contains an email value matching the signed-in account | section missing or empty             |
| `[data-mol-id="settings-section-workspace"]`              | section | the Workspace card with Collections / Mock servers / Monitors counts                                | section visible AND counts are numeric (or `—` while still loading)           | section missing                      |
| `[data-mol-id="settings-section-environment"]`            | section | the Active environment card                                                                         | section visible AND shows the current active environment name (or `none`)     | section missing                      |
| `[data-mol-id="settings-seed"]`                           | button  | POST `/api/collections` AND POST `/api/environments` to seed starter content; then refreshes counts | both POSTs are observed AND the Workspace counts increase                     | no network calls or counts unchanged |

## Hidden surfaces opened from this page

| trigger                                                   | what it opens | elements inside |
| --------------------------------------------------------- | ------------- | --------------- |
| (none — settings cards render inline; no menus or modals) | —             | —               |

## Network calls expected during normal use

| trigger              | method | path              | what request body or query is expected              |
| -------------------- | ------ | ----------------- | --------------------------------------------------- |
| Page load            | GET    | /api/environments | array of environments to derive the active env name |
| Page load            | GET    | /api/collections  | array of collections (count only used)              |
| Page load            | GET    | /api/mocks        | array of mocks (count only used)                    |
| Page load            | GET    | /api/monitors     | array of monitors (count only used)                 |
| Seed starter content | POST   | /api/collections  | `{ name, description }`                             |
| Seed starter content | POST   | /api/environments | `{ name, variables, is_active: true }`              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
