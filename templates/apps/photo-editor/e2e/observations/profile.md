# Page observations: /profile (Profile)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up via `signup(page)` then `browser_navigate` → `/profile`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — hero name + email + handle + plan badge + stats.
4. Re-navigate and re-snapshot.
5. When complete, write `e2e/profile.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                        | role | expected behavior on interaction                                                                                                          | success signal                                                                              | failure signal                       |
| --------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `[data-mol-id="profile-display-name"]` + `[data-mol-id="profile-email"]` + `[data-mol-id="profile-plan-badge"]` (`data-plan-key`) | text | the hero shows the signed-in user's actual `name`, `email`, and `planKey` from `/users/me` + `/api/billing/status` (no hardcoded strings) | name contains the signup name, email matches signup email, plan-key is `free` for new users | wrong / `Loading plan…` indefinitely |
| `[data-mol-id="profile-stat-frames"]` + `[data-mol-id="profile-stat-albums"]`                                                     | text | reflect the count of `/api/images` and `/api/albums` for this user, recomputed live                                                       | numeric matches GET length after a create round-trip                                        | wrong / stale count                  |
| `[data-mol-id="profile-handle"]`                                                                                                  | text | derives `@<email-local-part>` from the user's actual email                                                                                | text equals `@<local-part>`                                                                 | hardcoded string                     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | profile is fully visible at all times        |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected    |
| ----------- | ------ | --------------------- | ----------------------------------------- |
| (page load) | GET    | `/api/images`         | this user's images, used for hero counts  |
| (page load) | GET    | `/api/albums`         | this user's albums, used for hero counts  |
| (page load) | GET    | `/api/billing/status` | `{ planKey, name, isFree }` for the badge |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
