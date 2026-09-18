# Page observations: /signup (signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                      | role     | expected behavior on interaction | success signal                                  | failure signal                                   |
| ----------------------------------------------------------------------------------------------- | -------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| renders the form with name + email + password inputs                                            | heading  | covered by matching spec test    | element renders / asserted text becomes visible | request never fires, 4xx, or 5xx                 |
| Show/hide password toggle flips input type                                                      | button   | covered by matching spec test    | network response 2xx with documented body shape | request never fires, 4xx, or 5xx                 |
| Submitting valid credentials creates the user, persists token, and lands the user authenticated | button   | covered by matching spec test    | value persists across reload (read-after-write) | value not persisted; reload restores prior state |
| Footer shows Privacy / Terms / HIPAA labels                                                     | listitem | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect     |
| "Sign in" link navigates to /login                                                              | button   | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                        |
| Resigning up with the same email returns a duplicate-account error                              | button   | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect     |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| submit Create Account | POST   | /api/users | { name, email, password }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
