# Page observations: /home (Home)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role               | expected behavior on interaction          | success signal                  | failure signal       |
| ---------------------------------------------------------- | ------------------ | ----------------------------------------- | ------------------------------- | -------------------- |
| `getByRole('heading', { level: 1, name: /Good to see you   | Welcome back/i })` | heading                                   | renders greeting with user name | heading visible      | empty page |
| `getByRole('navigation', { name: /Primary navigation/i })` | navigation         | sidebar with 7 links to sections          | all links visible               | nav missing          |
| `getByRole('link', { name: /^Journal$/ })`                 | link               | navigates to /journal                     | URL /journal                    | 4xx/5xx              |
| `getByRole('link', { name: /^Insights$/ })`                | link               | navigates to /insights                    | URL /insights                   | 4xx/5xx              |
| `getByRole('link', { name: /^Calendar$/ })`                | link               | navigates to /calendar                    | URL /calendar                   | 4xx/5xx              |
| `getByRole('link', { name: /^Prompts$/ })`                 | link               | navigates to /prompts                     | URL /prompts                    | 4xx/5xx              |
| `getByRole('link', { name: /^Profile$/ })`                 | link               | navigates to /profile                     | URL /profile                    | 4xx/5xx              |
| `getByRole('link', { name: /^Settings$/ })`                | link               | navigates to /settings                    | URL /settings                   | 4xx/5xx              |
| `getByRole('link', { name: /New entry/i })`                | link               | navigates to /journal/new                 | URL /journal/new                | 4xx/5xx              |
| `getByText(/No reflections yet/i)`                         | text               | empty-state copy when user has no entries | visible for fresh user          | demo entries showing |

## Hidden surfaces opened from this page

| trigger                                            | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------------- | ------------- | -------------------------------------------- |
| `getByRole('button', { name: /open user menu/i })` | user dropdown | sign-out, profile links                      |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected |
| --------- | ------ | ------------------- | -------------------------------------- |
| Page load | GET    | /api/journal/today  | (no body)                              |
| Page load | GET    | /api/journal/recent | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/home.spec.ts`
