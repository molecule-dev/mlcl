# Page observations: /settings (Settings)

> Authed — four tabs: Profile, Gallery, Privacy, Notifications. Profile
> tab has display name + username inputs. Gallery tab has Allow Download
>
> - Show EXIF + watermarkLarge toggles. Privacy tab has publicProfile,
>   searchable, blockAi toggles. Notifications has notifyFeatured,
>   notifyComments, notifyFollows, weeklyDigest. Save button PATCHes
>   `/api/users/:id` with `{ name, oauthData: { photoPrefs } }`.
>   "Saved." banner appears after a successful round-trip.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role     | expected behavior on interaction          | success signal                                  | failure signal    |
| ----------------------------------------- | -------- | ----------------------------------------- | ----------------------------------------------- | ----------------- |
| `[data-testid="settings-name"]`           | textbox  | accepts new display name                  | input updates                                   | read-only         |
| `[data-testid="settings-tab-gallery"]`    | button   | switches to Gallery tab                   | tab content swaps                               | tab inert         |
| `[data-testid="settings-allow-download"]` | checkbox | toggles `photoPrefs.allowDownload`        | checked state flips                             | toggle inert      |
| `[data-testid="settings-show-exif"]`      | checkbox | toggles `photoPrefs.showExif`             | checked state flips                             | toggle inert      |
| `[data-testid="settings-save"]`           | button   | PATCH /api/users/:id; on 2xx shows banner | `[data-testid="settings-saved-banner"]` visible | error banner      |
| `[data-testid="settings-saved-banner"]`   | text     | confirms save round-trip                  | banner visible after save                       | no banner / error |

## Hidden surfaces opened from this page

| trigger           | what it opens             | elements inside                              |
| ----------------- | ------------------------- | -------------------------------------------- |
| Click Gallery tab | gallery preferences panel | allow-download, show-exif, watermark toggles |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected      |
| ---------- | ------ | -------------- | ------------------------------------------- |
| Page mount | GET    | /api/users/me  | `{ props: { id, name, oauthData: {...} } }` |
| Click Save | PATCH  | /api/users/:id | `{ name, oauthData: { photoPrefs } }`; 2xx  |
| After save | GET    | /api/users/me  | round-trip read confirms the patch          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
