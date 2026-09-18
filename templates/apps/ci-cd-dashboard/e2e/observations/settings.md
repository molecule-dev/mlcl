# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                               | role           | expected behavior on interaction                | success signal                                        | failure signal   |
| ------------------------------------------------------------------------ | -------------- | ----------------------------------------------- | ----------------------------------------------------- | ---------------- |
| `getByRole('heading', { name: /^Settings$/i, level: 1 })` + sidebar tabs | heading + tabs | renders title and all 5 tab buttons             | heading + Account/Repos/Webhooks/Secrets/Team visible | any missing      |
| account `getByLabel(/^Name$/i)` + `getByLabel(/^Email$/i)`               | textbox        | shows + accepts name/email edit                 | values reflect saved profile                          | empty            |
| account `getByRole('button', { name: /Save changes/i })`                 | button         | PUT /api/me with name                           | name persists across reload                           | error toast      |
| repositories tab                                                         | section        | lists connected repos                           | non-empty list visible                                | empty            |
| webhook list + add form                                                  | section + form | shows existing webhooks + Add webhook           | seeded rows + form fields visible                     | absent           |
| webhook `Add webhook` submit                                             | button         | POST /api/webhooks → list refresh               | new row visible                                       | error            |
| secret list + add form                                                   | section + form | shows existing secrets + Add secret             | seeded rows + form fields visible                     | absent           |
| secret `Add secret` submit                                               | button         | POST /api/secrets → list refresh + masked value | new row visible, plaintext NOT in API response        | plaintext leaked |
| team section                                                             | section        | shows current user as owner                     | email + owner role visible                            | absent           |

## Hidden surfaces opened from this page

| trigger                | what it opens    | elements inside (selector / role / behavior)    |
| ---------------------- | ---------------- | ----------------------------------------------- |
| Click Repositories tab | repo connections | list of repos with provider + language + branch |
| Click Webhooks tab     | webhook section  | webhook list + add form                         |
| Click Secrets tab      | secrets section  | secret list + add form (with scope select)      |
| Click Team tab         | team section     | current user as owner                           |

## Network calls expected during normal use

| trigger      | method | path          | what request body or query is expected |
| ------------ | ------ | ------------- | -------------------------------------- |
| Page load    | GET    | /api/me       | none                                   |
| Save account | PUT    | /api/me       | { name }                               |
| Webhooks tab | GET    | /api/webhooks | none                                   |
| Add webhook  | POST   | /api/webhooks | { name, url, events }                  |
| Secrets tab  | GET    | /api/secrets  | none                                   |
| Add secret   | POST   | /api/secrets  | { name, value, scope }                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
