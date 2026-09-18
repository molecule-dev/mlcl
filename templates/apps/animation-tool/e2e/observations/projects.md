# Page observations: /projects (Projects)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                  | success signal                                      | failure signal   |
| ------------------------------------------------------- | ------- | ------------------------------------------------- | --------------------------------------------------- | ---------------- |
| `getByRole('heading', { name: /Projects/i, level: 1 })` | heading | render projects heading                           | visible                                             | absent           |
| `getByRole('button', { name: /New project/i }).first()` | button  | POST /api/projects then navigate to /projects/:id | URL becomes /projects/<uuid>                        | stays            |
| `page.locator('input[type=search]')`                    | textbox | filter projects by name (client-side filter)      | data-mol-clicks attribute changes / list re-renders | input rejected   |
| `getByRole('button', { name: /^All$/i })`               | button  | filter to show all projects (data-mol-filter=all) | filter pill becomes active                          | filter unchanged |
| `getByRole('button', { name: /^Ready$/i })`             | button  | filter to show ready projects                     | data-mol-filter=ready                               | filter unchanged |
| `getByRole('button', { name: /^Rendering$/i })`         | button  | filter to show rendering projects                 | data-mol-filter=rendering                           | filter unchanged |
| `getByRole('button', { name: /^Draft$/i })`             | button  | filter to show draft projects                     | data-mol-filter=draft                               | filter unchanged |
| `getByRole('button', { name: /^Shared$/i })`            | button  | filter to show shared projects                    | data-mol-filter=shared                              | filter unchanged |
| `getByRole('button', { name: /^Errors$/i })`            | button  | filter to show errored projects                   | data-mol-filter=error                               | filter unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger           | method | path          | what request body or query is expected |
| ----------------- | ------ | ------------- | -------------------------------------- |
| page load         | GET    | /api/projects | (none)                                 |
| New project click | POST   | /api/projects | { name }                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects.spec.ts`
