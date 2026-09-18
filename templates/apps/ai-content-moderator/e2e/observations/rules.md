# Page observations: /rules (Rules)

Source: live walk via Playwright + e2e/rules.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                      | success signal                                        | failure signal |
| ------------------------------------------------------- | ------- | --------------------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| rule-name input (first text input on the page)          | textbox | rename the rule                                                       | value persists in DOM                                 | —              |
| `getByRole('button', { name: /publish rule/i })`        | button  | POST /api/rules with the form's name + compiled pattern               | new row appears in /api/rules list (read-after-write) | error toast    |
| `getByRole('button', { name: /^test/i })`               | button  | GET /api/moderation/stats/summary, show "Test pass: N items" feedback | feedback message visible                              | error toast    |
| `getByRole('button', { name: /toggle rule/i })` per row | button  | PUT /api/rules/:id { enabled: !current }                              | enabled flips on next GET                             | error toast    |
| `[data-mol-id="delete-rule"]` per row                   | button  | DELETE /api/rules/:id                                                 | rule removed from /api/rules list                     | error toast    |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                          | what request body or query is expected                      |
| ------------ | ------ | ----------------------------- | ----------------------------------------------------------- |
| initial load | GET    | /api/rules                    | 200 with array of rule rows                                 |
| publish      | POST   | /api/rules                    | { name, kind, pattern_or_threshold, action, enabled } → 201 |
| test         | GET    | /api/moderation/stats/summary | 200 with current counts                                     |
| toggle       | PUT    | /api/rules/:id                | { enabled: bool } → 200                                     |
| delete       | DELETE | /api/rules/:id                | empty → 204/200                                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/rules.spec.ts`
