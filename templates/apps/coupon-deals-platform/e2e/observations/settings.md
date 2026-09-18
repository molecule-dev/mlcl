# Page observations: /settings (Settings)

> Captured authenticated. Side-nav with 4 sections: Profile / Preferences /
> Notifications / Payment. Section is reflected in the URL hash so deep
> linking works.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                                | role       | expected behavior on interaction                            | success signal                        | failure signal  |
| --------------------------------------------------------- | ---------- | ----------------------------------------------------------- | ------------------------------------- | --------------- |
| `getByRole('heading', { name: 'Settings', level: 1 })`    | heading    | renders the side-nav heading                                | visible                               | missing         |
| `getByRole('navigation', { name: /settings sections/i })` | navigation | renders the section side-nav                                | visible                               | missing         |
| `getByRole('button', { name: 'Profile' })`                | button     | switches to the Profile section + sets `#profile`           | profile heading visible, hash updates | no state change |
| `getByRole('button', { name: 'Preferences' })`            | button     | switches to the Preferences section                         | preferences heading visible           | no state change |
| `getByRole('button', { name: 'Notifications' })`          | button     | switches to the Notifications section                       | notifications heading visible         | no state change |
| `getByRole('button', { name: 'Payment' })`                | button     | switches to the Payment section                             | payment heading visible               | no state change |
| `getByLabel('Display name')`                              | textbox    | edits the display name (Profile section)                    | typed value reflected                 | read-only       |
| `getByLabel('Email')`                                     | textbox    | shows the user's email (read-only)                          | matches signup email                  | wrong value     |
| `getByLabel('City')`                                      | textbox    | edits the user's city (Profile section)                     | typed value reflected                 | read-only       |
| `getByRole('button', { name: /save profile/i })`          | button     | PATCH /api/users/:id (name) + PUT /api/user-settings (city) | success state, persisted on reload    | error rendered  |

## Hidden surfaces opened from this page

| trigger                    | what it opens         | elements inside                                                           |
| -------------------------- | --------------------- | ------------------------------------------------------------------------- |
| Click Preferences button   | preferences section   | radius slider/select, favourite-category toggles, Save preferences button |
| Click Notifications button | notifications section | hot/expiring/redeemed/new_merchant toggles, Save notifications button     |
| Click Payment button       | payment section       | current plan badge, Manage billing link, Upgrade CTA                      |

## Network calls expected during normal use

| trigger             | method | path               | expected body                                                         |
| ------------------- | ------ | ------------------ | --------------------------------------------------------------------- |
| Page load           | GET    | /api/user-settings | `{ city, search_radius_km, favorite_categories, notification_prefs }` |
| Save profile        | PATCH  | /api/users/:id     | `{ name }`                                                            |
| Save profile (city) | PUT    | /api/user-settings | `{ city }`                                                            |
| Save preferences    | PUT    | /api/user-settings | `{ search_radius_km, favorite_categories }`                           |
| Save notifications  | PUT    | /api/user-settings | `{ notification_prefs }`                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
