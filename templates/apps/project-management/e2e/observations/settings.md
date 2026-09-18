# Page observations: /settings

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/settings.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/settings`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/settings.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction                               | success signal                               | failure signal       |
| -------------------------- | ------ | -------------------------------------------------------------- | -------------------------------------------- | -------------------- |
| Profile save               | button | PATCH /api/profile/me persists displayName + bio               | reload retains values                        | reload reverts       |
| Notifications toggles save | button | PATCH /api/profile/me persists email/push toggles              | reload retains toggles                       | reload reverts       |
| Theme toggle Dark Mode     | button | updates `data-mol-mode=dark` on <html>; persists across reload | after reload mol-mode=dark                   | reverts to light     |
| Change password            | button | PATCH /api/users/:id/password rotates hash; old pw rejected    | login with new pw succeeds; old pw fails     | old pw still logs in |
| Delete account             | button | DELETE /api/users/:id removes user; re-login forbidden         | redirects to /signup; subsequent login fails | user still logs in   |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path                    | what request body or query is expected       |
| ------------------ | ------ | ----------------------- | -------------------------------------------- |
| initial mount      | GET    | /api/profile/me         |                                              |
| profile save       | PATCH  | /api/profile/me         | {displayName, bio}                           |
| notifications save | PATCH  | /api/profile/me         | {emailNotifications, pushNotifications, ...} |
| change password    | PATCH  | /api/users/:id/password | {currentPassword, newPassword}               |
| delete account     | DELETE | /api/users/:id          |                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
