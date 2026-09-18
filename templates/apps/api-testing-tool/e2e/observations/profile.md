# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role             | expected behavior on interaction                                                             | success signal            | failure signal                                                    |
| ---------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `getByRole('heading', { level: 1 })`                 | heading          | renders the user's display name (or `Sign in to view your profile` if no auth bootstrap yet) | heading visible           | login redirect                                                    |
| `getByRole('heading', { name: /Recent activity/i })` | heading          | renders the activity panel heading                                                           | visible                   | missing                                                           |
| `getByText(/No requests have been fired yet/i)`      | empty-state copy | renders when the user has zero history rows                                                  | visible on a fresh signup | text missing while history empty                                  |
| `getByText(/Collections                              | Saved requests   | Monitors/i)`                                                                                 | metric eyebrow labels     | the three MetricStatCards on the profile hero render eyebrow text | all three eyebrow strings are visible | one or more missing |
| `getByText(/Your personal Pylon workspace/i)`        | bio copy         | renders the static bio paragraph in the hero                                                 | visible                   | missing                                                           |

## Hidden surfaces opened from this page

| trigger                                                               | what it opens | elements inside |
| --------------------------------------------------------------------- | ------------- | --------------- |
| (none — page is a read-only summary; no menus, modals, or accordions) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected            |
| --------- | ------ | -------------------- | ------------------------------------------------- |
| Page load | GET    | /api/collections     | count for the Collections metric                  |
| Page load | GET    | /api/requests        | count for the Saved-requests metric               |
| Page load | GET    | /api/monitors        | count for the Monitors metric                     |
| Page load | GET    | /api/history?limit=8 | most recent 8 history rows for the activity panel |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
