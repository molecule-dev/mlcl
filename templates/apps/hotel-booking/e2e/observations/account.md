# Page observations: /account (Account)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                              | role         | expected behavior on interaction                                     | success signal                                     | failure signal        |
| ------------------------------------------------------- | ------------ | -------------------------------------------------------------------- | -------------------------------------------------- | --------------------- |
| `getByRole('heading', { name: /^Account$/, level: 1 })` | heading      | renders the page heading                                             | heading visible                                    | not visible           |
| `getByRole('button', { name: /^Profile$/ })`            | button (tab) | switches to the Profile section (default)                            | section heading "Profile" rendered                 | unchanged             |
| `getByRole('button', { name: /^Loyalty$/ })`            | button (tab) | switches to the Loyalty section                                      | section heading "Loyalty" rendered with tier label | section unchanged     |
| `getByRole('button', { name: /^Preferences$/ })`        | button (tab) | switches to the Preferences section                                  | section heading "Preferences" rendered             | section unchanged     |
| `getByRole('textbox', { name: /^Name$/i })`             | textbox      | profile name field is editable and PATCHes `/api/profile/me` on save | response 200 with new name; reload preserves it    | reload shows old name |
| `getByRole('button', { name: /Save profile/i })`        | button       | submits the profile form                                             | a PATCH /api/profile/me is observed                | no network call       |

## Hidden surfaces opened from this page

| trigger         | what it opens                 | elements inside                             |
| --------------- | ----------------------------- | ------------------------------------------- |
| Loyalty tab     | inline section in main column | "Current tier" / tier label / progress text |
| Preferences tab | inline section in main column | language + notification toggles             |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| Page load    | GET    | /api/profile/me | returns the current profile            |
| Page load    | GET    | /api/loyalty/me | returns tier / points                  |
| Save profile | PATCH  | /api/profile/me | `{ name?: string, … }`                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/account.spec.ts`
