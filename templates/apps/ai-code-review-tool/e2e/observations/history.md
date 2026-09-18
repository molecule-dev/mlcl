# Page observations: /history (Review history)

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/history`.
> Auth-required.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                          | role     | expected behavior on interaction           | success signal                            | failure signal                     |
| --------------------------------------------------- | -------- | ------------------------------------------ | ----------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /Review history/i })` | heading  | renders page heading                       | h1 visible                                | missing                            |
| eyebrow `Refract · audit log · all`                 | text     | aria-live label updates with active filter | text contains current filter              | label stays stale on filter change |
| `getByText(/No reviews match this filter/)`         | text     | empty-state copy when no PRs               | visible after fresh signup                | populated                          |
| filter button `all`                                 | button   | applies `filter='all'`, aria-pressed=true  | aria-pressed=true; eyebrow includes "all" | filter does not apply              |
| filter button `open`                                | button   | restricts list to `state='open'` PRs       | only seeded open PR rows visible          | merged/closed PRs leak in          |
| filter button `merged`                              | button   | restricts list to `state='merged'` PRs     | matches state                             | wrong rows shown                   |
| filter button `draft`                               | button   | restricts list to draft PRs                | matches                                   | wrong rows                         |
| filter button `closed`                              | button   | restricts list to closed PRs               | matches                                   | wrong rows                         |
| seeded PR row                                       | listitem | renders title + repo + branch + +/− stats  | row visible after `seedReviewedPR`        | row absent                         |
| seeded PR row click                                 | link     | navigates to `/prs/:id`                    | URL becomes `/prs/<uuid>`                 | nothing happens                    |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside (selector / role / behavior) |
| ------- | -------------------------------- | -------------------------------------------- |
| (none)  | history page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path                 | what request body or query is expected             |
| ------------ | ------ | -------------------- | -------------------------------------------------- |
| initial load | GET    | `/api/pull-requests` | owner-scoped PR list                               |
| initial load | GET    | `/api/repositories`  | owner-scoped repo list (used for repo name lookup) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms; just filter buttons)
- [x] Every link href / route destination is documented (PR row links)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/history.spec.ts`
