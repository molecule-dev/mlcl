# Page observations: /profile (Profile)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/profile.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role   | expected behavior on interaction                                                 | success signal                           | failure signal                             |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `[data-mol-id="profile-page"]`           | region | profile shell renders for the signed-in user                                     | element visible                          | absent                                     |
| `[data-mol-id="profile-email"]`          | text   | shows the signed-in account email                                                | element contains the user's email        | absent or wrong email                      |
| `[data-mol-id="profile-signature"]`      | text   | mirrors the signature stored by `/settings` (default placeholder for fresh user) | content matches the latest Settings save | stays at the default after a Settings save |
| `[data-mol-id="profile-activity-empty"]` | text   | empty-state shown for a fresh user with no drafts/sends/templates                | element visible until first activity     | row visible despite no activity            |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — profile is read-only metadata, not interactive) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path             | what request body or query is expected |
| ------- | ------ | ---------------- | -------------------------------------- |
| mount   | GET    | /api/drafts      | (none)                                 |
| mount   | GET    | /api/sent-emails | (none)                                 |
| mount   | GET    | /api/templates   | (none)                                 |
| mount   | GET    | /api/contacts    | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
