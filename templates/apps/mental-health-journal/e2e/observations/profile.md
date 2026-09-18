# Page observations: /profile (Profile)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                               | role    | expected behavior on interaction                   | success signal     | failure signal   |
| ------------------------------------------------------------------------ | ------- | -------------------------------------------------- | ------------------ | ---------------- |
| `getByRole('heading', { level: 1 })`                                     | heading | renders user's display name (e.g. "Walker Tester") | matches user input | placeholder text |
| `getByText(/Reflecting since/i)`                                         | text    | shows member-since date based on signup            | visible            | empty            |
| `getByText(/^Reflections$/i)`                                            | text    | label for total entries stat                       | visible            | not rendered     |
| `getByText(/Words written/i)`                                            | text    | label for total words stat                         | visible            | not rendered     |
| `getByText(/Longest streak/i)`                                           | text    | label for longest streak stat                      | visible            | not rendered     |
| `getByRole('heading', { level: 3, name: /Your mood mix this season/i })` | heading | renders mood-mix section                           | visible            | not rendered     |
| `getByRole('heading', { level: 3, name: /Milestones/i })`                | heading | renders milestones section                         | visible            | not rendered     |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| Page load | GET    | /api/journal/profile-stats | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
