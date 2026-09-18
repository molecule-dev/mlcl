# Page observations: /prs/:id (Pull request detail)

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/prs/<id>`.
> Auth-required. Walked after seeding a repository + PR + completed review.

## Page state assumed

- [x] Authenticated AND the seeded PR + review + comments exist for this user

## Elements

| selector / accessible name                                    | role     | expected behavior on interaction                 | success signal                                   | failure signal                 |
| ------------------------------------------------------------- | -------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------ |
| `getByRole('link', { name: /Dashboard/i })` (breadcrumb)      | link     | navigates to `/dashboard`                        | URL becomes `/dashboard`                         | stays on detail page           |
| `getByRole('link', { name: /Review history/i })` (breadcrumb) | link     | navigates to `/history`                          | URL becomes `/history`                           | stays on detail page           |
| `getByRole('heading', { level: 1 })` (PR title)               | heading  | shows seeded PR title                            | non-empty title text matches seed                | empty / placeholder            |
| status pill (open/merged/closed/draft)                        | text     | shows `pr.state` with tinted badge               | label matches state                              | wrong tint or label            |
| head/base ref + author                                        | text     | format `repo · headRef → baseRef · author_login` | text contains seeded refs                        | missing refs                   |
| `+additions` / `-deletions` counters                          | text     | render with green/red emphasis                   | numbers match seed                               | NaN / blank                    |
| review row (latest)                                           | listitem | shows status + score (`quality_score / 10`)      | row visible with `(quality_score/10).toFixed(1)` | row missing                    |
| `[data-mol-id="review-comment-body"]`                         | text     | renders comment body_md (NOT empty placeholder)  | body text non-empty                              | empty / placeholder            |
| `[data-mol-id="review-comment-patch"]`                        | code     | renders inline `suggested_patch` when present    | `<pre>` with patch text                          | not rendered when patch exists |
| invalid PR id                                                 | n/a      | renders friendly unavailable message + back link | "This pull request is unavailable." visible      | crash / blank page             |

## Hidden surfaces opened from this page

| trigger | what it opens                 | elements inside (selector / role / behavior) |
| ------- | ----------------------------- | -------------------------------------------- |
| (none)  | PR detail has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path                               | what request body or query is expected           |
| ------------ | ------ | ---------------------------------- | ------------------------------------------------ |
| initial load | GET    | `/api/pull-requests/<id>`          | single PR row                                    |
| initial load | GET    | `/api/repositories/<repo_id>`      | parent repo row (only when pr.repository_id set) |
| initial load | GET    | `/api/reviews?pr_id=<id>`          | reviews for this PR                              |
| per review   | GET    | `/api/reviews/<reviewId>/comments` | comment thread for each review                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none on this page)
- [x] Every form has every field documented (read-only page)
- [x] Every link href / route destination is documented (breadcrumbs)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/prs__id.spec.ts`
