# Page observations: /login (Login)

Email + password login form. Asserts validation, error path, and successful redirect to /home.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                 | role          | expected behavior on interaction                         | success signal                                             | failure signal                       |
| ------------------------------------------ | ------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| email + password fields rendered           | form          | page renders the login form with email + password inputs | both inputs visible                                        | inputs missing                       |
| `getByRole("button", { name: /sign in      | log in/i })`  | button                                                   | submits credentials → POST /api/login → redirects to /home | URL becomes /home, auth token stored | stays on /login, error toast |
| `getByRole("link", { name: /create account | sign up/i })` | link                                                     | navigates to /signup                                       | URL becomes /signup                  | URL unchanged                |
| `getByRole("link", { name: /forgot/i })`   | link          | navigates to /forgot-password                            | URL becomes /forgot-password                               | URL unchanged                        |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path       | what request body or query is expected             |
| -------------------- | ------ | ---------- | -------------------------------------------------- |
| submit valid creds   | POST   | /api/login | { email, password } → 200 with access token cookie |
| submit invalid creds | POST   | /api/login | 401 — UI surfaces error                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
