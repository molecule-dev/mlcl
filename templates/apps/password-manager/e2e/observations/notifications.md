# Page observations: /notifications (Notifications)

> Filled from a live walk via Playwright MCP at /notifications. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role         | expected behavior on interaction                                 | success signal                                              | failure signal             |
| -------------------------------------- | ------------ | ---------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| `getByRole('heading')` (notifications) | heading      | render the page heading + empty state OR list when feed has rows | heading visible + (empty marker OR rows)                    | page blank                 |
| `getByRole('link', { name: /security   | shared/i })` | link                                                             | navigate to relevant detail page (security or shared vault) | URL changes to target page | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                   | what request body or query is expected                 |
| ---------- | ------ | ---------------------- | ------------------------------------------------------ |
| page mount | GET    | /api/security/findings | returns active findings used to populate notifications |
| page mount | GET    | /api/shares/incoming   | returns incoming vault shares                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
