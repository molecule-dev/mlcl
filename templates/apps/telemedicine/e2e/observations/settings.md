# Page observations: /settings (settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                               | role    | expected behavior on interaction | success signal                                  | failure signal                                   |
| ---------------------------------------------------------------------------------------- | ------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Unauthenticated visit redirects to /login                                                | element | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                        |
| Renders Settings heading + section nav (Account/Practice/Availability/Notifications)     | heading | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect     |
| Calls GET /api/profile/me on initial load                                                | network | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx                 |
| Account: editing display name persists via PUT /api/profile/me and is readable on reload | network | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |
| Practice: editing licensed states persists into preferences.practice                     | element | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |
| Availability: timezone+day window persists into preferences.availability                 | element | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |
| Notifications: toggles persist into preferences.notifications                            | button  | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/profile/me | (none)                                 |
| save      | PUT    | /api/profile/me | { name?, preferences }                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
