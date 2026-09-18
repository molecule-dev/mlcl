# Page observations: /profile

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/profile`.
> Auth-required.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                           | success signal                         | failure signal               |
| --------------------------------------------------- | ------------------ | ---------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| `getByRole('heading', { level: 1 })` (display name) | heading            | shows the signed-in user's name (or email)                 | text matches signup name               | placeholder / wrong identity |
| email line under heading                            | text               | shows `user.email` in mono font                            | matches signup email                   | missing or different email   |
| initials chip (avatar)                              | image (decorative) | renders first two characters of the name                   | content equals first 2 chars uppercase | wrong characters             |
| KPI tile `Reviews`                                  | section            | shows total reviews count                                  | "Reviews" label + numeric value        | label or value missing       |
| KPI tile `Day streak`                               | section            | shows current consecutive-day review streak                | numeric streak rendered                | NaN / missing                |
| KPI tile `Avg score`                                | section            | shows average review score (or `—`)                        | renders                                | missing                      |
| KPI tile `Critical`                                 | section            | shows critical review count                                | numeric value                          | missing                      |
| heatmap grid                                        | image (decorative) | renders 28 day cells (last 28 days) with intensity classes | exactly 28 cells                       | wrong count                  |
| timeline list                                       | list               | shows up to 5 recent reviews after seeding                 | seeded review id appears in list       | empty when seeded            |
| ScoreCard                                           | section            | renders score + breakdown (open/merged/repos)              | KPI labels visible                     | missing                      |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside (selector / role / behavior) |
| ------- | -------------------------------- | -------------------------------------------- |
| (none)  | profile page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path                     | what request body or query is expected |
| ------------ | ------ | ------------------------ | -------------------------------------- |
| initial load | GET    | `/api/reports/summary`   | aggregate KPI summary                  |
| initial load | GET    | `/api/reviews?limit=200` | full review list for streak + heatmap  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented (no links)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
