# Page observations: /repos/:id (Repository detail)

> Filled from a Playwright MCP walk of the live app at
> `http://localhost:3070/repos/<id>`. Auth-required. Walked after seeding a
> repository + PR + completed review via the helper.

## Page state assumed

- [x] Authenticated AND a repo+PR+review are seeded for the user

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                                  | success signal                     | failure signal         |
| ----------------------------------------------------------- | ------- | ----------------------------------------------------------------- | ---------------------------------- | ---------------------- |
| `getByRole('link', { name: /Repositories/i })` (breadcrumb) | link    | navigates back to `/repos`                                        | URL becomes `/repos`               | stays on detail page   |
| `getByRole('heading', { level: 1 })` (repo full_name)       | heading | shows the seeded full_name                                        | text matches the seeded repo       | placeholder/empty      |
| `getByRole('button', { name: /Pull requests/i })` (tab)     | button  | activates the prs tab; aria-pressed=true                          | aria-pressed=true; PR list visible | tab does not flip      |
| `getByRole('button', { name: /Reviews/i })` (tab)           | button  | activates the reviews tab; recent review rows shown               | review list visible                | nothing happens        |
| `getByRole('button', { name: /Rules/i })` (tab)             | button  | activates rules pane with link to `/rules`                        | "Open rules editor" link visible   | tab does not switch    |
| `getByRole('button', { name: /Repo settings/i })` (tab)     | button  | activates settings pane (provider / default_branch / sync_status) | dl rows visible                    | tab does not switch    |
| recent PR row (link)                                        | link    | navigates to `/prs/:id` for the seeded PR                         | URL becomes `/prs/<uuid>`          | nothing happens        |
| `getByRole('link', { name: /Open rules editor/i })`         | link    | navigates to `/rules`                                             | URL becomes `/rules`               | stays on detail page   |
| KPI tiles (Open / Reviewed / Critical / Avg score)          | section | render computed values from API responses                         | tile values present                | values are NaN / blank |

## Hidden surfaces opened from this page

| trigger                                        | what it opens     | elements inside (selector / role / behavior)                              |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| Tab buttons (PRs / Reviews / Rules / Settings) | tab panel content | corresponding section visible (PR list, reviews list, rules CTA, dl rows) |

## Network calls expected during normal use

| trigger      | method | path                                    | what request body or query is expected |
| ------------ | ------ | --------------------------------------- | -------------------------------------- |
| initial load | GET    | `/api/repositories/<id>`                | single repository row                  |
| initial load | GET    | `/api/pull-requests?repository_id=<id>` | PRs for this repository                |
| initial load | GET    | `/api/reviews`                          | review rows joined to PRs in this repo |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (4 tabs)
- [x] Every form has every field documented (no forms; tab panel is read-only)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/repos__id.spec.ts`
