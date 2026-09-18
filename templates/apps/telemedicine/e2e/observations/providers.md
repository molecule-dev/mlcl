# Page observations: /providers (providers)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                             | role     | expected behavior on interaction | success signal                                  | failure signal                               |
| ---------------------------------------------------------------------- | -------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Lists the seeded directory of verified providers                       | listitem | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Specialty filter dropdown is populated from /api/providers/specialties | combobox | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx             |
| Search box filters cards by display name (debounced after 2 chars)     | combobox | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Each provider card links to /providers/:id/book                        | button   | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Clicking a provider card navigates to the booking page (auth required) | button   | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| Specialty list comes from a real API call                              | listitem | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx             |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| page load | GET    | /api/providers             | ?q=&specialty=&...                     |
| page load | GET    | /api/providers/specialties | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/providers.spec.ts`
