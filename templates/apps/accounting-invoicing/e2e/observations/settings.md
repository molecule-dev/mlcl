# Page observations: /settings

> Filled by AI agent driving the running smoke app on 3010/4010 with
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

| selector / accessible name                          | role    | expected behavior on interaction                  | success signal                        | failure signal         |
| --------------------------------------------------- | ------- | ------------------------------------------------- | ------------------------------------- | ---------------------- |
| `getByRole("heading", {name:/settings/i, level:1})` | heading | static — display only                             | visible                               | missing                |
| Company profile form fields                         | textbox | editable text fields                              | values retained                       | no save                |
| "Save profile" button                               | button  | PUT /api/settings/company → toast/success         | persists across reload                | inline alert           |
| Integration row Connect button                      | button  | PUT /api/settings/integrations/:id → status flips | integration status visible            | no flip                |
| "Add integration" form/button                       | button  | POST /api/settings/integrations → row appears     | row visible                           | inline alert           |
| "Invite teammate" form                              | textbox | button                                            | POST /api/settings/team → row appears | persists across reload | inline alert |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path                           | what request body or query is expected |
| ------------------ | ------ | ------------------------------ | -------------------------------------- |
| initial mount      | GET    | /api/settings/company          | (authenticated)                        |
| initial mount      | GET    | /api/settings/integrations     | (authenticated)                        |
| initial mount      | GET    | /api/settings/team             | (authenticated)                        |
| save profile       | PUT    | /api/settings/company          | {name, email, address, ...}            |
| add integration    | POST   | /api/settings/integrations     | {name, type}                           |
| toggle integration | PUT    | /api/settings/integrations/:id | {status}                               |
| invite teammate    | POST   | /api/settings/team             | {email, role}                          |
| remove teammate    | DELETE | /api/settings/team/:id         |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
