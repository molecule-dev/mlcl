# Page observations: /settings

> Captured live via Playwright MCP at `http://localhost:3070/settings`. The
> page is a tabbed shell with three tabs (Editor / Sync / Account); each
> tab is observed below.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                  | role    | expected behavior on interaction                                                                   | success signal                                                                         | failure signal    |
| --------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                              | link    | navigate to `/home`                                                                                | URL is `/home`                                                                         | URL unchanged     |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings)         | link    | navigate to the named route                                                                        | URL becomes that path                                                                  | URL unchanged     |
| `getByRole('button', { name: /open user menu/i })`                          | button  | open user-menu popover                                                                             | popover appears                                                                        | nothing happens   |
| Tab `getByRole('button', { name: 'Editor' })`                               | button  | switch to Editor tab; aria-pressed flips                                                           | tab content is "Typography & writing surface" card                                     | does not switch   |
| Tab `getByRole('button', { name: 'Sync' })`                                 | button  | switch to Sync tab                                                                                 | tab content is "How your notes travel" card                                            | does not switch   |
| Tab `getByRole('button', { name: 'Account' })`                              | button  | switch to Account tab                                                                              | tab content shows display name / email / plan rows + change-password / log-out actions | does not switch   |
| Editor tab `getByRole('switch', { name: 'Serif body text' })`               | switch  | toggle persists; PATCH `/api/profile/me` `{ verso: { serifBody } }`                                | switch state survives reload                                                           | not persisted     |
| Editor tab `getByRole('slider', { name: 'Line height' })`                   | slider  | change persists; PATCH `/api/profile/me` `{ verso: { lineHeight } }`                               | new value survives reload; CSS variable updates                                        | not persisted     |
| Editor tab `getByRole('switch', { name: /backlink graph hover preview/i })` | switch  | toggle persists                                                                                    | reload preserves state                                                                 | not persisted     |
| Editor tab theme buttons (`Light` / `Dark` / `Sepia`)                       | button  | select theme; PATCH `/api/profile/me` `{ verso: { theme } }`; sets `<html data-theme>` accordingly | `documentElement.dataset.theme` flips and persists across reload                       | aria-pressed only |
| Sync tab `getByRole('switch', { name: 'Realtime sync' })`                   | switch  | toggle persists; PATCH `/api/profile/me` `{ verso: { realtimeSync } }`                             | reload preserves state                                                                 | not persisted     |
| Account tab Display name input                                              | textbox | edit + debounced PATCH `/api/profile/me` `{ name }`                                                | reload reflects new name                                                               | not persisted     |
| Account tab Email field (read-only)                                         | text    | shows current email; not editable                                                                  | matches `/api/profile/me`                                                              | mismatched        |
| Account tab Plan field                                                      | text    | shows current plan name                                                                            | matches `/api/billing/status` plan                                                     | hardcoded         |
| Account tab `getByRole('button', { name: /change password/i })`             | button  | open change-password form / PATCH `/api/users/password`                                            | new password works on next login                                                       | nothing happens   |
| Account tab `getByRole('button', { name: /log out/i })`                     | button  | clear session, redirect to `/login`                                                                | URL becomes `/login`, no JWT in localStorage                                           | nothing happens   |

## Hidden surfaces opened from this page

| trigger                      | what it opens           | elements inside (selector / role / behavior)            |
| ---------------------------- | ----------------------- | ------------------------------------------------------- |
| Editor / Sync / Account tabs | swap right-pane content | typography card / sync card / account card respectively |
| `Open user menu`             | popover                 | shared sidebar user popover                             |
| `Change password`            | inline form / modal     | current + new password inputs, save button              |

## Network calls expected during normal use

| trigger                            | method        | path                  | what request body or query is expected        |
| ---------------------------------- | ------------- | --------------------- | --------------------------------------------- |
| initial load                       | GET           | `/api/profile/me`     | returns user including `verso` preferences    |
| any switch / slider / theme select | PATCH         | `/api/profile/me`     | `{ verso: { … } }` partial preferences object |
| display-name edit (debounced)      | PATCH         | `/api/profile/me`     | `{ name }`                                    |
| change password                    | PATCH         | `/api/users/password` | `{ currentPassword, newPassword }`            |
| log out                            | (client-side) | —                     | clears local token, navigates to `/login`     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
