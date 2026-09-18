# Page observations: /goals (GoalsPage)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/goals.
> Headings: 1: Goals; 3: progress cards.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role     | expected behavior on interaction    | success signal                     | failure signal         |
| ------------------------------------------------- | -------- | ----------------------------------- | ---------------------------------- | ---------------------- |
| `getByRole('heading', { name: /goals/i })`        | heading  | renders the page title              | heading visible                    | nothing rendered / 401 |
| `getByRole('link', { name: /add goal/i })`        | link     | routes to /goals/new                | URL becomes /goals/new             | no navigation          |
| `[data-mol-id="goal-card"]` (one per seeded goal) | listitem | shows goal name + target + progress | seeded goal visible after seedGoal | empty list after seed  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path       | expected body                |
| --------- | ------ | ---------- | ---------------------------- |
| Page load | GET    | /api/goals | response 200, array of goals |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/goals.spec.ts`
