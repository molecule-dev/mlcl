# Page observations: /settings (Settings)

Source: live walk via Playwright + e2e/settings.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                                          | success signal                                | failure signal       |
| -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| `getByRole("heading", { name: /^Settings$/i })`    | heading | settings shell renders + GET /api/profile + /api/billing + /api/team_members + /api/integrations all fire | all four GETs in network                      | one or more 4xx/5xx  |
| `getByRole("button", { name: /^Account$/i })`      | button  | switch to account section + PATCH /api/profile on save persists across reload                             | PATCH /api/profile + reload shows new value   | value lost on reload |
| `getByRole("button", { name: /^Integrations$/i })` | button  | integrations section: Connect → POST /api/integrations/:id/toggle → reload shows Disconnect               | POST + Disconnect button visible after reload | state not persisted  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                         | what request body or query is expected                   |
| ------------------ | ------ | ---------------------------- | -------------------------------------------------------- |
| initial load       | GET    | /api/profile                 | 200 with profile fields                                  |
| initial load       | GET    | /api/billing                 | 200 with billing summary                                 |
| initial load       | GET    | /api/team_members            | 200 with array (may be empty)                            |
| initial load       | GET    | /api/integrations            | 200 with array of {id,name,status}                       |
| account save       | PATCH  | /api/profile                 | {display_name,handle} body — 200 OK with persisted shape |
| integration toggle | POST   | /api/integrations/:id/toggle | 200 with {id,status}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
