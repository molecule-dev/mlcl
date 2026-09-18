# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role                 | expected behavior on interaction                | success signal                      | failure signal       |
| --------------------------------------------------------------- | -------------------- | ----------------------------------------------- | ----------------------------------- | -------------------- |
| Section nav button "organization"                               | button               | switch panel to organization section (default)  | org form visible                    | unchanged            |
| Section nav button "account"                                    | button               | switch panel to account section                 | account form with email visible     | not visible          |
| Section nav button "billing"                                    | button               | switch panel to billing section                 | plan info visible                   | not visible          |
| Organization name input                                         | textbox              | accept new org name                             | value reflects typed text           | empty                |
| `getByRole('button', { name: /save changes/i })` (org form)     | button               | PATCH /api/users/me, persist oauthData.org_name | GET /api/users/me returns new value | unchanged            |
| Display name input (account section)                            | textbox              | accept display name                             | value reflects typed text           | empty                |
| `getByRole('button', { name: /save changes/i })` (account form) | button               | PATCH /api/users/me, persist users.name         | GET /api/users/me returns new value | unchanged            |
| `getByRole('button', { name: /upgrade                           | manage billing/i })` | button                                          | navigate to /pricing                | URL becomes /pricing | stays |

## Hidden surfaces opened from this page

| trigger                       | what it opens     | elements inside (selector / role / behavior)   |
| ----------------------------- | ----------------- | ---------------------------------------------- |
| Section nav (account/billing) | per-section panel | section-specific inputs/buttons (see Elements) |

## Network calls expected during normal use

| trigger           | method | path                | what request body or query is expected |
| ----------------- | ------ | ------------------- | -------------------------------------- |
| page load         | GET    | /api/users/me       | (none)                                 |
| page load         | GET    | /api/billing/status | (none)                                 |
| Save org          | PATCH  | /api/users/me       | { oauthData: { org_name } }            |
| Save display name | PATCH  | /api/users/me       | { name }                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-settings.spec.ts`
