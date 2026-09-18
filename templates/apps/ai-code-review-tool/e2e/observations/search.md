# Page observations: /search

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/search`.
> Auth-required; the input is client-side filtering over loaded PRs / repos / rules.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                   | role         | expected behavior on interaction                                                | success signal                | failure signal      |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------------- | ----------------------------- | ------------------- |
| `getByRole('heading', { name: /^Search$/ })` | heading      | renders page heading                                                            | h1 visible                    | missing             |
| search input (placeholder /Search PRs/)      | searchbox    | client-side filters the indexed list as you type                                | hits update on input          | typing does nothing |
| empty-index state                            | text         | "Connect a repository or add custom rules to start indexing." when no data      | visible after fresh signup    | populated           |
| empty-query state                            | text         | "No results match your query." when query has no matches but index is populated | visible after typing nonsense | results show        |
| group heading "PR"                           | heading (h2) | section appears when at least one PR matches                                    | visible after seeding a PR    | missing             |
| group heading "Repository"                   | heading (h2) | section appears when at least one repo matches                                  | visible after seeding a repo  | missing             |
| group heading "Rule"                         | heading (h2) | section appears when at least one custom rule matches                           | visible after creating a rule | missing             |
| PR result link                               | link         | navigates to `/prs/:id`                                                         | URL becomes `/prs/<uuid>`     | nothing happens     |
| Repository result link                       | link         | navigates to `/repos/:id`                                                       | URL becomes `/repos/<uuid>`   | nothing happens     |
| Rule result link                             | link         | navigates to `/rules`                                                           | URL becomes `/rules`          | nothing happens     |

## Hidden surfaces opened from this page

| trigger | what it opens                   | elements inside (selector / role / behavior) |
| ------- | ------------------------------- | -------------------------------------------- |
| (none)  | search page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path                 | what request body or query is expected          |
| ------------ | ------ | -------------------- | ----------------------------------------------- |
| initial load | GET    | `/api/pull-requests` | owner-scoped PR list (used as the search index) |
| initial load | GET    | `/api/repositories`  | owner-scoped repo list (search index)           |
| initial load | GET    | `/api/custom-rules`  | owner-scoped rules list (search index)          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (single search input)
- [x] Every link href / route destination is documented (per-result link)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
