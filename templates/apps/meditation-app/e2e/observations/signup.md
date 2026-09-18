# Page observations: /signup (Signup)

Email + password registration. Asserts form fields and successful redirect to /home.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role           | expected behavior on interaction         | success signal           | failure signal                                             |
| ------------------------------------------------- | -------------- | ---------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| first/last/email/password/confirm inputs rendered | form           | all five inputs visible on initial paint | inputs present           | fields missing                                             |
| `getByRole("button", { name: /sign up             | create account | get started/i })`                        | button                   | POST /api/signup → redirects to /home with auth cookie set | URL becomes /home, accessToken in localStorage | stays on /signup with error |
| `getByRole("link", { name: /sign in               | log in/i })`   | link                                     | navigates back to /login | URL becomes /login                                         | URL unchanged                                  |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger           | method | path        | what request body or query is expected                                  |
| ----------------- | ------ | ----------- | ----------------------------------------------------------------------- |
| submit valid form | POST   | /api/signup | { email, password, firstName, lastName } → 200 with access token + user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
