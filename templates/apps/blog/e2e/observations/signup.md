# Page observations: /signup

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/signup. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role          | expected behavior on interaction                            | success signal                     | failure signal    |
| --------------------------------------------- | ------------- | ----------------------------------------------------------- | ---------------------------------- | ----------------- |
| `getByRole('heading', { level: 1, name: /join | sign up/i })` | heading                                                     | renders signup title               | visible           | missing |
| `#signup-email` (LoginEmailField input)       | textbox       | accepts an email address                                    | accepts text                       | not editable      |
| `#signup-password` (LoginPasswordField input) | password      | accepts a password (min 8 chars)                            | accepts text                       | not editable      |
| Validation message for missing/invalid email  | text          | inline error appears on blur/submit when invalid            | visible                            | missing           |
| Validation message for password < 8 chars     | text          | inline error visible on submit                              | visible                            | missing           |
| `[data-mol-id="button-signup-submit"]`        | button        | POST /api/users { email, password } via authClient.register | navigates off /signup → /dashboard | toast / stays     |
| `[data-mol-id="link-signin"]` (Sign in link)  | link          | navigates to /login                                         | URL becomes /login                 | unchanged         |
| Top-level form-error region (role=alert)      | alert         | shows server errors (existing email, etc.)                  | visible on failure                 | absent on success |
| OAuth section (LoginOAuthButtons)             | button(s)     | initiates OAuth flow                                        | redirects off-site                 | no-op             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger       | method | path       | what request body or query is expected |
| ------------- | ------ | ---------- | -------------------------------------- |
| signup submit | POST   | /api/users | { email, password, name? }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
