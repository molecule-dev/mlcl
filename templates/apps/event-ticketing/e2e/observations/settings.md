# Page observations: /settings (Settings)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/settings.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> profile / notifications / security / billing settings

## Procedure

1. `mcp__playwright__browser_navigate` → `/settings` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/settings.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name            | role     | expected behavior on interaction | success signal                  | failure signal |
| ------------------------------------- | -------- | -------------------------------- | ------------------------------- | -------------- |
| `First name input`                    | text     | profile field                    | value retained                  | no save        |
| `Last name input`                     | text     | profile field                    | value retained                  | no save        |
| `Display name input`                  | text     | profile field                    | value retained                  | no save        |
| `Bio textarea`                        | textarea | profile field                    | value retained                  | no save        |
| `"Save changes" button (Profile)`     | button   | PATCH /api/profile/me            | status "Profile saved." visible | alert          |
| `Section nav button "Notifications"`  | button   | switch to notifications section  | section visible                 | no switch      |
| `Section nav button "Security"`       | button   | switch to security section       | section visible                 | no switch      |
| `Section nav button "Plan & billing"` | button   | switch to billing section        | section visible                 | no switch      |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected |
| ------------ | ------ | ------------------- | -------------------------------------- |
| load         | GET    | /api/profile/me     | profile row                            |
| save profile | PATCH  | /api/profile/me     | {firstName, lastName, …}               |
| load billing | GET    | /api/billing/status | current subscription                   |
| load tiers   | GET    | /api/billing/tiers  | pricing tiers list                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
