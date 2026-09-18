# Page observations: /profile/:handle (Profile)

> Filled from a Playwright MCP walk of the live app. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                    | success signal                        | failure signal      |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| `<h1>` displayName                                 | heading | producer's full name (or username/email fallback)                   | matches signed-in user                | wrong/empty         |
| meta line `@handle · joined <year>`                | text    | computed from `/api/preferences` handle, falls back to email-prefix | visible                               | missing             |
| bio paragraph                                      | text    | from `/api/preferences.bio` or default copy                         | visible                               | missing             |
| `getByRole('link', { name: /edit profile/i })`     | link    | hero CTA to `/settings`                                             | URL = `/settings`                     | broken              |
| `getByRole('link', { name: /^Projects$/ })`        | link    | secondary hero CTA to `/projects`                                   | URL = `/projects`                     | broken              |
| `ProfileStat` card "Projects"                      | text    | numeric count from `/api/projects`                                  | matches list length                   | wrong               |
| `ProfileStat` card "Tracks"                        | text    | sum of `track_count` over projects                                  | matches                               | wrong               |
| `ProfileStat` card "Minutes"                       | text    | sum of `duration_seconds` / 60 (formatted with `fmtCount`)          | matches                               | wrong               |
| `ProfileStat` card "Samples"                       | text    | count of own (user_id===me) samples                                 | matches `/api/samples?owner=me` count | wrong               |
| `getByRole('heading', { name: /Your projects/i })` | heading | section heading                                                     | visible                               | missing             |
| `getByRole('heading', { name: /Your samples/i })`  | heading | section heading                                                     | visible                               | missing             |
| `getByRole('link', { name: /^View all$/ })`        | link    | "View all" → `/projects`                                            | URL = `/projects`                     | broken              |
| anonymous `/profile/:handle`                       | n/a     | AuthGuard redirect                                                  | URL = `/login`                        | renders anonymously |

## Hidden surfaces opened from this page

| trigger | what it opens                                  | elements inside (selector / role / behavior) |
| ------- | ---------------------------------------------- | -------------------------------------------- |
| (none)  | profile is single-screen marketing of the user | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | `/api/preferences` | own preferences (handle, bio, city)    |
| initial load | GET    | `/api/projects`    | own projects                           |
| initial load | GET    | `/api/samples`     | sample library (own + public)          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile__handle.spec.ts`
