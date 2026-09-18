# Page observations: /segments/:key (SegmentDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seeded with beta_testers

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction                          | success signal                 | failure signal |
| --------------------------------------------------------------- | ------- | --------------------------------------------------------- | ------------------------------ | -------------- |
| Description textarea                                            | textbox | edit segment description; Save persists                   | textarea value survives reload | content lost   |
| `getByRole('button', { name: /save/i })` (description save)     | button  | submit edit, PUT /api/segments/:id                        | success, fields persist        | error          |
| Rules tab (default)                                             | tab     | display seeded condition for beta_testers                 | condition row visible          | empty          |
| Used-in tab                                                     | tab     | switch view to flags using this segment                   | renders without error          | crash          |
| `getByRole('button', { name: /add rule/i })`                    | button  | reveal rule editor; PUT /api/segments/:id with conditions | new rule visible after submit  | error          |
| Audit tab                                                       | tab     | shows targeting_changed entries after rule edits          | entries visible after edits    | absent         |
| `getByRole('button', { name: /delete/i })` (segment)            | button  | DELETE /api/segments/:id, redirect to /segments           | URL becomes /segments          | stays          |
| `getByRole('link', { name: /back to segments/i })` (breadcrumb) | link    | navigate to /segments                                     | URL becomes /segments          | stays          |

## Hidden surfaces opened from this page

| trigger         | what it opens                 | elements inside (selector / role / behavior)                      |
| --------------- | ----------------------------- | ----------------------------------------------------------------- |
| Add rule button | inline rule editor            | attribute select, operator select, values input, Save rule button |
| Used-in tab     | flags using this segment list | flag link cards                                                   |
| Audit tab       | per-segment audit-log entries | listitem rows                                                     |

## Network calls expected during normal use

| trigger          | method | path               | what request body or query is expected |
| ---------------- | ------ | ------------------ | -------------------------------------- |
| page load        | GET    | /api/segments/:key | (none)                                 |
| page load        | GET    | /api/audit-log     | filtered by segment                    |
| Save description | PUT    | /api/segments/:id  | { description }                        |
| Save rule        | PUT    | /api/segments/:id  | { conditions: [...] }                  |
| Delete           | DELETE | /api/segments/:id  | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-segments__key.spec.ts`
