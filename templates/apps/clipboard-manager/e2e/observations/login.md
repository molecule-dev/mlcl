# Page observations: /login (Login)

Source: live walk via Playwright + e2e/login.spec.ts. Two-field login
form. On 200 the JWT is persisted and the user is redirected to the
intended destination (default `/clips`). Bad credentials surface a
visible error and stay on the page.

## Page state assumed

- [x] Public (unauthenticated, only useful for anon visitors)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction      | success signal                        | failure signal  |
| ------------------------------------------------------- | ------- | ------------------------------------- | ------------------------------------- | --------------- |
| `input#email` + `input#password` + submit               | form    | renders both fields and submit button | all visible                           | missing         |
| Submit with valid creds → POST /api/users/log-in (200)  | form    | persists JWT, routes to /clips        | network 200 + URL is /clips           | error visible   |
| Submit fires POST /api/users/log-in via network capture | network | POST endpoint invoked                 | captured 200 in network               | no fetch        |
| Submit with bad creds shows error + stays on /login     | alert   | shows error, URL stays /login         | `[data-mol-id="login-error"]` visible | redirected away |
| `getByRole('link', { name: /forgot/i })`                | link    | navigates to /forgot-password         | URL becomes /forgot-password          | URL unchanged   |
| `getByRole('link', { name: /create an account/i })`     | link    | navigates to /signup                  | URL becomes /signup                   | URL unchanged   |
| Show/hide password eye button                           | button  | flips input type password ↔ text      | type attribute changes                | no toggle       |

## Hidden surfaces opened from this page

| trigger       | what it opens        | elements inside (selector / role / behavior) |
| ------------- | -------------------- | -------------------------------------------- |
| OAuth buttons | redirect to provider | not exercised in tests                       |

## Network calls expected during normal use

| trigger      | method        | path               | what request body or query is expected               |
| ------------ | ------------- | ------------------ | ---------------------------------------------------- |
| submit form  | POST          | /api/users/log-in  | `{email, password}` → 200 with `{accessToken, user}` |
| post-success | (auth client) | localStorage write | persists JWT + user; pushes token into HTTP bond     |

## Coverage check (final pass)

- [x] Navigated and re-navigated, no new elements found
- [x] All form fields documented
- [x] Both alternate routes (forgot, signup) tested
- [x] Error path (bad creds) tested
- [x] Show/hide password toggle tested
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
