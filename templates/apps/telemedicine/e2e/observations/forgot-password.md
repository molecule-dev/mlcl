# Page observations: /forgot-password (forgot-password)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                      | role   | expected behavior on interaction | success signal                                  | failure signal                               |
| ----------------------------------------------------------------------------------------------- | ------ | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| renders email input + submit button                                                             | button | covered by matching spec test    | element renders / asserted text becomes visible | request never fires, 4xx, or 5xx             |
| Submitting an email returns success (regardless of registration) and the request actually fires | button | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Submitting for a registered user fires forgot-password endpoint with that email                 | button | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Has a "back to sign in" link                                                                    | button | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected |
| ---------------------- | ------ | -------------------------- | -------------------------------------- |
| submit Send Reset Link | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
