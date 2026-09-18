# Page observations: /progress (Progress dashboard)

Captured via `node scripts/observe-page.mjs ai-study-buddy /progress --auth`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role       | expected behavior on interaction               | success signal        | failure signal         |
| ------------------------------------------------------------- | ---------- | ---------------------------------------------- | --------------------- | ---------------------- |
| `[data-mol-id="page-progress"]`                               | container  | top-level wrapper renders                      | visible after auth    | redirected to `/login` |
| `getByRole('heading', { name: /your learning trajectory/i })` | heading h1 | renders page title                             | visible               | missing                |
| `getByText(/this week/i)`                                     | text       | metric label for weekly hours                  | visible               | missing                |
| `getByText(/avg\.? mastery/i)`                                | text       | metric label for mastery %                     | visible               | missing                |
| `getByText(/recall rate/i)`                                   | text       | metric label for recall %                      | visible               | missing                |
| `getByText(/streak/i)`                                        | text       | metric label for streak days                   | visible               | missing                |
| `getByRole('heading', { name: /your study minutes/i })`       | heading h2 | renders weekly minutes chart                   | visible               | missing                |
| `getByText(/peak:/i)`                                         | text       | chart caption with peak value                  | visible               | missing                |
| `getByRole('heading', { name: /subject trends/i })`           | heading h3 | renders subject trends section                 | visible               | missing                |
| `getByText(/add courses to see/i)`                            | text       | empty-state hint when user has no subjects yet | visible for new users | missing                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger    | method | path            | what request body or query is expected     |
| ---------- | ------ | --------------- | ------------------------------------------ |
| page mount | GET    | `/api/progress` | `{ summary, weeklyMinutes[], subjects[] }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/28-progress.spec.ts`
