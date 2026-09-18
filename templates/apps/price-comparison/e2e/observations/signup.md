# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name      | role    | expected behavior on interaction       | success signal                            | failure signal      |
| ------------------------------- | ------- | -------------------------------------- | ----------------------------------------- | ------------------- |
| `#name` "Display name"          | textbox | accepts free text                      | input value reflects typing               | input not focusable |
| `#email` "Email address"        | textbox | accepts email                          | input value reflects typing               | input not focusable |
| `#password` "Password"          | textbox | type=password                          | masked input value                        | not masked          |
| `#confirm` "Confirm password"   | textbox | mismatch shows error                   | mismatch alert visible                    | alert never appears |
| "Create my Sift account" submit | button  | POST /api/users → redirect off /signup | URL leaves `/signup`, JWT in localStorage | error toast         |
| "Sign in" footer link           | link    | navigates to `/login`                  | URL is `/login`                           | wrong route         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| submit  | POST   | /api/users | name, email, password                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
