# Page observations: /settings

> Observed via Playwright at http://localhost:3080/settings — preferences
> page rendered by `pages/Settings.tsx`. Toggles persist via PATCH
> /api/users/:id (oauthData.preferences blob).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                               | success signal                             | failure signal |
| ---------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------ | -------------- |
| `getByRole('heading', { name: /settings/i })`  | heading | renders the page title                                         | visible                                    | missing        |
| `#setting-breaking`                            | switch  | toggles "Breaking news alerts" → PATCH /api/users/:id          | aria-checked flips, server stores          | aria static    |
| `#setting-daily`                               | switch  | toggles "Daily digest" → PATCH /api/users/:id                  | aria-checked flips, persists across reload | aria static    |
| `#setting-email`                               | switch  | toggles "Email digest" → PATCH /api/users/:id                  | aria-checked flips                         | aria static    |
| `#setting-hide-read`                           | switch  | toggles "Hide read stories" → PATCH /api/users/:id             | aria-checked flips                         | aria static    |
| `#setting-bias-balanced`                       | switch  | toggles "Always show balanced coverage" → PATCH /api/users/:id | aria-checked flips                         | aria static    |
| `#setting-bias-meters`                         | switch  | toggles "Show bias meters in feed" → PATCH /api/users/:id      | aria-checked flips, persists               | aria static    |
| `getByRole('button', { name: /sign\s*out/i })` | button  | clears session → /login                                        | URL becomes /login                         | session intact |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none — flat preference panel) | —             | —               |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected         |
| ------------ | ------ | -------------- | ---------------------------------------------- |
| Mount        | GET    | /api/users/:id | refresh user with persisted prefs              |
| Toggle click | PATCH  | /api/users/:id | { oauthData: { ...prev, preferences: {...} } } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/07-settings-persist.spec.ts` (Daily + Bias toggles, with reload-persistence)
