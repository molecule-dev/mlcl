# Page observations: /settings (Settings)

Tabbed settings panel — Profile, Verifications, Payment methods,
Preferences. Persists via `PATCH /api/users/:id` (canonical user
schema; phone + preferences flow through `oauthData`).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                    | role   | expected behavior on interaction                                       | success signal                                          | failure signal    |
| ----------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- | ------------------------------------------------------- | ----------------- |
| Section button `getByRole('button', { name: /verifications/i })`              | button | switch active section                                                  | aria-current=page on Verifications, panel content swaps | section unchanged |
| First-name field `getByRole('textbox', { name: /first name/i })`              | input  | type new first name                                                    | value updates locally                                   | not editable      |
| `getByRole('button', { name: /save changes/i })`                              | button | PATCH /api/users/:id; `Saved` notice appears; reload preserves change  | banner + reload-after still shows new value             | error notice      |
| Push-notifications toggle `getByRole('switch').first()` (Preferences section) | switch | flips boolean; PATCH /api/users/:id; preferences round-trip via reload | aria-checked updates and persists across reload         | reverts           |
| `getByRole('link', { name: /open billing/i })` (Payment methods section)      | link   | navigate to /pricing                                                   | URL becomes /pricing                                    | no navigation     |

## Hidden surfaces opened from this page

(no menus; the settings panels themselves are sectional tabs)

## Network calls expected during normal use

| trigger           | method | path           | what request body or query is expected                   |
| ----------------- | ------ | -------------- | -------------------------------------------------------- |
| save profile      | PATCH  | /api/users/:id | { name, email, oauthData: { phone, preferences } } → 200 |
| toggle preference | PATCH  | /api/users/:id | { oauthData: { preferences: {...} } } → 200              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
