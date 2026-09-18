# Page observations: /assets (Assets)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction | success signal        | failure signal   |
| ----------------------------------------------------- | ------- | -------------------------------- | --------------------- | ---------------- |
| `getByRole('heading', { name: /Assets/i, level: 1 })` | heading | render assets heading            | visible               | absent           |
| `getByRole('button', { name: /^All$/i })`             | button  | filter to show all assets        | data-mol-filter=all   | filter unchanged |
| `getByRole('button', { name: /^Images$/i })`          | button  | filter to type=image only        | data-mol-filter=image | filter unchanged |
| `getByRole('button', { name: /^SVG$/i })`             | button  | filter to type=svg only          | data-mol-filter=svg   | filter unchanged |
| `getByRole('button', { name: /^Video$/i })`           | button  | filter to type=video only        | data-mol-filter=video | filter unchanged |
| `getByRole('button', { name: /^Audio$/i })`           | button  | filter to type=audio only        | data-mol-filter=audio | filter unchanged |
| `getByRole('button', { name: /^Fonts$/i })`           | button  | filter to type=font only         | data-mol-filter=font  | filter unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected |
| --------- | ------ | ------------------- | -------------------------------------- |
| page load | GET    | /api/assets         | (none)                                 |
| page load | GET    | /api/assets/summary | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/assets.spec.ts`
