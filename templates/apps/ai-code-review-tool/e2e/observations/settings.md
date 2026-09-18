# Page observations: /settings

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/settings`.
> Auth-required.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                                                                                 | success signal                                                             | failure signal                                     |
| -------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| `getByRole('heading', { name: /^Settings$/ })`                 | heading | renders page heading                                                                                                             | h1 visible                                                                 | missing                                            |
| `getByRole('heading', { name: /^Integrations$/i })`            | heading | section heading visible                                                                                                          | visible                                                                    | missing                                            |
| `getByRole('heading', { name: /^API keys$/i })`                | heading | section heading visible                                                                                                          | visible                                                                    | missing                                            |
| `getByRole('heading', { name: /^Team$/i })`                    | heading | section heading visible                                                                                                          | visible                                                                    | missing                                            |
| `getByRole('heading', { name: /^Notifications$/i })`           | heading | section heading visible                                                                                                          | visible                                                                    | missing                                            |
| `getByRole('button', { name: /^Connect$/ })` (per provider)    | button  | POST `/api/api-credentials` with `{ provider, encrypted_token, scopes_json }`; row flips to `Disconnect`; persists across reload | "Disconnect" button visible AND `GET /api/api-credentials` returns the row | nothing happens, no POST, or row gone after reload |
| `getByRole('button', { name: /^Disconnect$/ })` (per provider) | button  | DELETE `/api/api-credentials/:id`; badge flips back to `Connect`                                                                 | "Connect" buttons restored, DELETE 204 captured                            | row remains in API list                            |
| `getByRole('button', { name: /^Profile$/i })` (Team section)   | button  | navigates to `/profile`                                                                                                          | URL becomes `/profile`                                                     | nothing happens                                    |
| `getByRole('button', { name: /Open notifications/i })`         | button  | navigates to `/notifications`                                                                                                    | URL becomes `/notifications`                                               | nothing happens                                    |

## Hidden surfaces opened from this page

| trigger | what it opens                     | elements inside (selector / role / behavior) |
| ------- | --------------------------------- | -------------------------------------------- |
| (none)  | settings page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger          | method | path                       | what request body or query is expected             |
| ---------------- | ------ | -------------------------- | -------------------------------------------------- |
| initial load     | GET    | `/api/api-credentials`     | owner-scoped credentials list                      |
| Connect click    | POST   | `/api/api-credentials`     | `{ provider, encrypted_token, scopes_json }` → 201 |
| Disconnect click | DELETE | `/api/api-credentials/:id` | 204                                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms; just buttons)
- [x] Every link href / route destination is documented (no links — uses navigate)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
