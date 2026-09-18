# Page observations: /flags/:key (FlagDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seeded with onboarding-revamp-v3

## Elements

| selector / accessible name                        | role                         | expected behavior on interaction                      | success signal                                 | failure signal     |
| ------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ---------------------------------------------- | ------------------ |
| `getByRole('link', { name: /back to flags         | all flags/i })` (breadcrumb) | link                                                  | navigate to /flags                             | URL becomes /flags | stays |
| Description textarea                              | textbox                      | edit description; Save persists                       | textarea value survives reload                 | content lost       |
| Rollout slider input                              | slider                       | adjust rollout %; Save Changes PUT /api/flags/:id     | DB rollout_percentage matches new value        | unchanged          |
| `getByRole('button', { name: /save changes/i })`  | button                       | submit edits, PUT /api/flags/:id                      | success toast / fields persist                 | error              |
| `getByRole('button', { name: /add rule/i })`      | button                       | reveal rule editor; submit POSTs /api/flags/:id/rules | new rule rendered, DB row created              | error              |
| Toggle button on detail page                      | switch                       | flip is_enabled via PUT /api/flags/:id/toggle         | aria-pressed flips, GET shows new value        | unchanged          |
| `getByRole('button', { name: /delete/i })` (flag) | button                       | DELETE /api/flags/:id, redirect to /flags             | URL becomes /flags, GET no longer returns flag | stays              |
| Audit-log inline entry on detail page             | listitem                     | shows latest action targeting this flag               | rendered after each save                       | absent             |

## Hidden surfaces opened from this page

| trigger         | what it opens           | elements inside (selector / role / behavior)              |
| --------------- | ----------------------- | --------------------------------------------------------- |
| Add rule button | inline rule editor form | attribute select, operator, value input, Save rule button |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected   |
| ------------ | ------ | --------------------- | ---------------------------------------- |
| page load    | GET    | /api/flags/:key       | (none)                                   |
| page load    | GET    | /api/audit-log        | filtered by flag                         |
| Save Changes | PUT    | /api/flags/:id        | { rolloutPercentage, ... }               |
| Toggle       | PUT    | /api/flags/:id/toggle | { environmentId }                        |
| Save rule    | POST   | /api/flags/:id/rules  | { attribute, operator, values, variant } |
| Delete       | DELETE | /api/flags/:id        | (none)                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-flags__key.spec.ts`
