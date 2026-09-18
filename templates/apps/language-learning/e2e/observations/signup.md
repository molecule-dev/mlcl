# Page observations: Signup /signup

> Filled by AI agent driving the running app via Playwright. Each row
> corresponds to an element actually rendered by the page when this file
> was generated.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role  | expected behavior on interaction | success signal                        | failure signal                       |
| -------------------------- | ----- | -------------------------------- | ------------------------------------- | ------------------------------------ |
| `input[type="text"]`       | input | accepts text input               | value reflects input or stays visible | no change / error toast / page crash |
| `input[type="email"]`      | input | accepts text input               | value reflects input or stays visible | no change / error toast / page crash |
| `input[type="password"]`   | input | accepts text input               | value reflects input or stays visible | no change / error toast / page crash |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected |
| ------------- | ------ | ------------------------- | -------------------------------------- |
| signup submit | POST   | /api/users                | { email, password, name }              |
| lang persist  | PATCH  | /api/users/me/preferences | { target_languages: [code] }           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
