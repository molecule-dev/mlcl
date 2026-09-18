# Page observations: /dashboard (dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction | success signal                   | failure signal      |
| ------------------------------------------------------------ | ------- | -------------------------------- | -------------------------------- | ------------------- |
| `getByRole("heading", { name: /Dreamscape/i, level: 1 })`    | heading | render dashboard title           | visible                          | absent              |
| `getByRole("link", { name: /New image/i })` (sidebar)        | link    | navigate to /generate            | URL becomes /generate            | stays on /dashboard |
| `getByRole("link", { name: /Gallery/i })` (sidebar)          | link    | navigate to /gallery             | URL becomes /gallery             | stays               |
| `getByRole("link", { name: /Collections/i })` (sidebar)      | link    | navigate to /collections         | URL becomes /collections         | stays               |
| `getByRole("link", { name: /Settings/i })` (sidebar)         | link    | navigate to /settings            | URL becomes /settings            | stays               |
| `getByRole("button", { name: /Sign out/i })` (sidebar)       | button  | sign out and redirect to /       | URL becomes / or /login          | stays on /dashboard |
| `getByRole("button", { name: /Toggle theme/i })`             | button  | toggle dark/light mode           | html class or theme-attr changes | no DOM diff         |
| `getByRole("link", { name: /Account settings/i })` (top bar) | link    | navigate to /settings            | URL becomes /settings            | stays               |
| `getByRole("link", { name: /Upgrade plan/i })`               | link    | navigate to /settings            | URL becomes /settings            | stays               |
| `getByRole("link", { name: /Open studio/i })`                | link    | navigate to /generate            | URL becomes /generate            | stays               |
| `getByRole("link", { name: /Open gallery/i })`               | link    | navigate to /gallery             | URL becomes /gallery             | stays               |
| `getByPlaceholder(/dreamscape/i)`                            | textbox | accept prompt input              | value reflects input             | value empty         |
| `getByRole("button", { name: /Generate/i })` (dashboard)     | button  | POST /api/generations            | request issued                   | no network call     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path             | what request body or query is expected |
| -------------- | ------ | ---------------- | -------------------------------------- |
| page load      | GET    | /api/credits     | (none)                                 |
| page load      | GET    | /api/generations | (none)                                 |
| Generate click | POST   | /api/generations | prompt + style                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
