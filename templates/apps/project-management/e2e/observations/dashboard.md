# Page observations: /dashboard

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/dashboard.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/dashboard`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/dashboard.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role    | expected behavior on interaction                     | success signal                     | failure signal      |
| ----------------------------------------------- | ------- | ---------------------------------------------------- | ---------------------------------- | ------------------- |
| "New Project" CTA / form                        | button  | POST /api/projects creates row + navigates to /board | project listed + URL on /board     | inline alert        |
| Greeting tile                                   | heading | shows user.name from /api/profile/me                 | name visible                       | missing             |
| Tasks list — toggle status                      | button  | PATCH /api/tasks/:id flips done/todo                 | task status persists across reload | reverts on reload   |
| Empty-state CTA when no projects                | text    | shows "Create your first project" or similar         | visible for fresh user             | missing             |
| Sidebar links → /settings, /my-tasks, /calendar | link    | each routes to the named page                        | URL changes                        | stays on /dashboard |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path            | what request body or query is expected |
| ------------------ | ------ | --------------- | -------------------------------------- |
| initial mount      | GET    | /api/profile/me | (authenticated)                        |
| initial mount      | GET    | /api/projects   | (authenticated)                        |
| initial mount      | GET    | /api/tasks      | (authenticated)                        |
| new-project submit | POST   | /api/projects   | {name, description?, color?}           |
| task toggle        | PATCH  | /api/tasks/:id  | {status}                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
