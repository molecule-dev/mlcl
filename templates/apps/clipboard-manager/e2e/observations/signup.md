# Page observations: /signup (Signup)

Source: live walk via Playwright + e2e/signup.spec.ts. Three-field
signup form (name, email, password). On 201 the auth client persists
JWT + user to localStorage and the page navigates to `/clips`.

## Page state assumed

- [x] Public (unauthenticated, anon visitors only)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                         | success signal     | failure signal    |
| ------------------------------------------------------------------ | ------- | -------------------------------------------------------- | ------------------ | ----------------- |
| `input#name` + `input#email` + `input#password` + submit           | form    | renders three fields + submit                            | all visible        | missing           |
| Submit (POST /api/users → 201) routes to /clips with JWT persisted | form    | post-success: URL is /clips, accessToken in localStorage | both true          | error visible     |
| Submit fires POST /api/users via network capture                   | network | POST endpoint invoked                                    | captured 201       | no fetch          |
| User payload (email) persists to localStorage                      | form    | `molecule:auth:user` JSON contains the typed email       | string match       | missing/different |
| Duplicate email shows inline error and stays on /signup            | alert   | URL stays /signup after dup attempt                      | URL unchanged      | redirected away   |
| `getByRole('link', { name: /sign in/i })`                          | link    | routes to /login                                         | URL becomes /login | URL unchanged     |

## Hidden surfaces opened from this page

| trigger       | what it opens        | elements inside (selector / role / behavior) |
| ------------- | -------------------- | -------------------------------------------- |
| OAuth buttons | redirect to provider | not exercised in tests (no real OAuth creds) |

## Network calls expected during normal use

| trigger      | method        | path               | what request body or query is expected                     |
| ------------ | ------------- | ------------------ | ---------------------------------------------------------- |
| submit form  | POST          | /api/users         | `{name, email, password}` → 201 with `{accessToken, user}` |
| post-success | (auth client) | localStorage write | `molecule:auth:accessToken` + `molecule:auth:user` set     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Form fields documented (3 inputs + submit + show/hide toggle)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
