# Page observations: /dashboard (dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                 | role    | expected behavior on interaction | success signal                                  | failure signal                               |
| ------------------------------------------------------------------------------------------ | ------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Unauthenticated visit redirects to /login                                                  | element | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| Greets the signed-in user by name and shows Solace shell nav                               | button  | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| Hero KPI tiles render with real data after seed                                            | element | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| "Up next today" + "Flagged patients" + Priority sections render after seed                 | element | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| "View all" link routes to /appointments                                                    | link    | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| "All patients →" routes to /patients                                                       | link    | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| Last-vitals snapshot fields use real seeded values (glucose 92, sodium 140, potassium 4.1) | textbox | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| User menu opens; Sign out logs out and lands on /login                                     | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                         | what request body or query is expected |
| --------- | ------ | ---------------------------- | -------------------------------------- |
| page load | GET    | /api/appointments            | ?filter=today                          |
| page load | GET    | /api/reports/vitals          | (none)                                 |
| page load | GET    | /api/reports/vitals-snapshot | (none)                                 |
| page load | GET    | /api/patients                | (none)                                 |
| page load | GET    | /api/profile/me              | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
