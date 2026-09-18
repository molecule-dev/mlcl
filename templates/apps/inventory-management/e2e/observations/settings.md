# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction             | success signal         | failure signal |
| -------------------------- | ------ | -------------------------------------------- | ---------------------- | -------------- |
| team tab                   | button | shows team list with current user as owner   | visible                | missing        |
| edit-profile link          | link   | navigates to /profile                        | URL is /profile        | no navigation  |
| locations tab              | button | shows add-warehouse link to /warehouses      | visible                | missing        |
| integrations toggle        | switch | PATCH /users/:id with oauthData.integrations | persists across reload | reverts        |
| alert rule toggle          | switch | POST/PUT /alerts/rules                       | persists across reload | reverts        |
| billing tab plan name      | text   | renders /billing/status.name                 | matches API            | mismatch       |
| see-plans link             | link   | navigates to /pricing                        | URL is /pricing        | no navigation  |

## Hidden surfaces opened from this page

| trigger          | what it opens      | elements inside (selector / role / behavior) |
| ---------------- | ------------------ | -------------------------------------------- |
| team tab         | team panel         | role rows + invite button                    |
| integrations tab | integrations panel | one switch per integration                   |

## Network calls expected during normal use

| trigger            | method | path                | what request body or query is expected |
| ------------------ | ------ | ------------------- | -------------------------------------- |
| page load          | GET    | /api/billing/status | auth                                   |
| page load          | GET    | /api/alerts/rules   | auth                                   |
| toggle integration | PATCH  | /api/users/:id      | { oauthData: { integrations } }        |
| toggle alert rule  | POST   | /api/alerts/rules   | { kind, enabled, config }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
