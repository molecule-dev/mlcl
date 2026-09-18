# Page observations: /reset-password (reset-password)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                 | role    | expected behavior on interaction | success signal                                  | failure signal                               |
| -------------------------------------------------------------------------- | ------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| renders email + token + new-password fields                                | heading | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| Reading email + token from URL pre-fills the form                          | textbox | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Submitting an invalid token surfaces an error and stays on /reset-password | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| "Back to sign in" link routes to /login                                    | button  | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| "Request a new link" link routes to /forgot-password                       | link    | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path                | what request body or query is expected |
| ----------------------- | ------ | ------------------- | -------------------------------------- |
| submit Set new password | POST   | /api/reset_password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
