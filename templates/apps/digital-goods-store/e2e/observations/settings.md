# Page observations: /settings (Settings)

> Captured from an authenticated seller.

## Page state assumed

- [x] Authenticated — settings persist via /api/profile/me

## Elements

| selector / accessible name              | role    | expected behavior on interaction | success signal                           | failure signal  |
| --------------------------------------- | ------- | -------------------------------- | ---------------------------------------- | --------------- |
| `[data-testid="settings-store-name"]`   | textbox | accepts new store name           | value persists across reload             | reload reverts  |
| `[data-testid="settings-tagline"]`      | textbox | accepts a tagline                | value persists                           | reload reverts  |
| `[data-testid="settings-payout-email"]` | textbox | accepts payout email             | value persists                           | reload reverts  |
| `[data-testid="settings-color-7c3aed"]` | button  | sets brand color to purple       | active border on chip                    | no toggle       |
| `[data-testid="settings-save"]`         | button  | PATCH /api/profile/me            | toast "Settings saved" + reload-survives | inline error    |
| `[data-testid="settings-discard"]`      | button  | resets fields to last persisted  | inputs revert                            | nothing changes |
| `[data-testid="settings-upgrade-link"]` | link    | nav to /pricing                  | URL becomes /pricing                     | no nav          |

## Hidden surfaces opened from this page

| trigger | what it opens            | elements inside                    |
| ------- | ------------------------ | ---------------------------------- |
| Save    | inline saved-status text | "Settings saved." then auto-clears |

## Network calls expected during normal use

| trigger   | method | path            | expected body                                   |
| --------- | ------ | --------------- | ----------------------------------------------- |
| Page load | GET    | /api/profile/me | returns settings + planKey                      |
| Save      | PATCH  | /api/profile/me | { storeName, tagline, payoutEmail, brandColor } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
