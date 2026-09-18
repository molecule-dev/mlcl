# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role             | expected behavior on interaction | success signal        | failure signal        |
| -------------------------------------------------------- | ---------------- | -------------------------------- | --------------------- | --------------------- |
| `getByRole('heading', { name: /Dashboard/i, level: 1 })` | heading          | render dashboard heading         | visible               | absent                |
| sidebar `getByRole('link', { name: /^addNew Project$     | ^New Project$    | New project/i })`                | link                  | navigate to /projects | URL becomes /projects | stays |
| sidebar `getByRole('link', { name: /folder.*Projects     | ^Projects$/i })` | link                             | navigate to /projects | URL becomes /projects | stays                 |
| sidebar `getByRole('link', { name: /Library/i })`        | link             | navigate to /library             | URL becomes /library  | stays                 |
| sidebar `getByRole('link', { name: /Assets/i })`         | link             | navigate to /assets              | URL becomes /assets   | stays                 |
| sidebar `getByRole('link', { name: /Settings/i })`       | link             | navigate to /settings            | URL becomes /settings | stays                 |
| `getByRole('link', { name: /View all/i })`               | link             | navigate to projects list        | URL becomes /projects | stays                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected               |
| --------- | ------ | ------------- | ---------------------------------------------------- |
| page load | GET    | /api/projects | (none)                                               |
| page load | GET    | /api/exports  | (filtered by project; may be skipped if no projects) |
| page load | GET    | /api/activity | (none)                                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
