# Page observations: settings

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the account form, the preferences tab, and the underlying user
> resource round-trip.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role                                                              | expected behavior on interaction                        | success signal                                                                  | failure signal                                           |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `getByLabel(/^name$                               | display name/i)` prefilled with current name                      | textbox                                                 | Renders the current account name when `/settings` opens                         | Field value matches signup name on first render          | Empty / wrong value              |
| `getByRole('button', { name: /save                | update.*name/i })`                                                | button                                                  | Update display name via PATCH `/api/users/:id`, persist across reload           | New name visible on the page after submit + after reload | Old name re-appears after reload |
| `getByRole('tab                                   | button', { name: /preferences/i })` and the start-of-week control | tab+select                                              | Switching to Preferences then changing the start-of-week persists across reload | Selected value preserved after `page.reload()`           | Reverts to default after reload  |
| PATCH `/api/users/:id` round-trip on display name | route                                                             | Direct API write reflected in next GET `/api/users/:id` | new name returned                                                               | name unchanged                                           |

## Hidden surfaces opened from this page

| trigger                 | what it opens            | elements inside (selector / role / behavior)                 |
| ----------------------- | ------------------------ | ------------------------------------------------------------ |
| Click "Preferences" tab | inline preferences panel | start-of-week selector, theme controls, notification toggles |

## Network calls expected during normal use

| trigger          | method | path           | what request body or query is expected |
| ---------------- | ------ | -------------- | -------------------------------------- |
| Save name        | PATCH  | /api/users/:id | `{ name }` → 200                       |
| Save preferences | PATCH  | /api/users/:id | `{ preferences: {...} }` → 200         |
| Initial render   | GET    | /api/users/:id | → 200 with user props                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-settings.spec.ts`
