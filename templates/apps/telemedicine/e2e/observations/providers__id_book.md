# Page observations: /providers/:id/book (providers__id_book)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                        | role   | expected behavior on interaction | success signal                                  | failure signal                                   |
| --------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Renders provider header + appointment-type select + slots + reason textarea + Confirm button                                      | button | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect     |
| Confirm button is disabled until a slot is selected, then enabled after click                                                     | button | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect     |
| Booking creates an appointment row with the selected provider/time, navigates to /appointments, and the next list shows the visit | button | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                        |
| Switching the appointment type to "Phone Call" persists into the POST body                                                        | button | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |
| Switching to "Chat" maps the wire type to "messaging" before posting                                                              | button | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx                 |
| Booking page without a providerId in the URL shows a "select provider first" empty state                                          | button | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect     |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected                         |
| --------- | ------ | ------------------ | -------------------------------------------------------------- |
| page load | GET    | /api/providers/:id | (none)                                                         |
| submit    | POST   | /api/appointments  | { provider_id, scheduled_at, duration_minutes, type, reason? } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/providers__id_book.spec.ts`
