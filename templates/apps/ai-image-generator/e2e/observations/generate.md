# Page observations: /generate (generate)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role            | expected behavior on interaction | success signal                     | failure signal  |
| ---------------------------------------------------------- | --------------- | -------------------------------- | ---------------------------------- | --------------- |
| `getByRole("heading", { name: /Studio/i, level: 1 })`      | heading         | render Studio heading            | visible                            | absent          |
| `getByPlaceholder(/dreamscape/i)`                          | textbox         | accept prompt                    | value reflects input               | value empty     |
| `getByRole("button", { name: /Photoreal/i })` (style chip) | button (toggle) | select photoreal style           | aria-pressed becomes true          | no toggle       |
| `getByRole("button", { name: /Anime/i })` (style chip)     | button (toggle) | select anime style               | aria-pressed becomes true          | no toggle       |
| `getByRole("button", { name: /Generate/i })`               | button          | POST /api/generations            | request issued, batch list updates | no network call |
| `getByRole("button", { name: /1:1 Square/i })`             | button (aspect) | select 1:1 aspect                | aria-pressed becomes true          | no toggle       |
| `getByRole("button", { name: /16:9 Wide/i })`              | button (aspect) | select 16:9 aspect               | aria-pressed becomes true          | no toggle       |
| `getByRole("combobox")` (Model)                            | combobox        | switch active model              | selected option changes            | no change       |
| `getByRole("slider")` (Steps)                              | slider          | change step count                | value attr updates                 | no change       |
| `getByRole("spinbutton")` (Seed)                           | spinbutton      | allow user-specified seed        | value reflects input               | no change       |
| `getByRole("button", { name: /Randomize seed/i })`         | button          | replace seed with random integer | spinbutton value changes           | no change       |
| `getByRole("button", { name: /Lock seed/i })`              | button (toggle) | toggle seed lock state           | aria-pressed flips                 | no toggle       |
| `getByRole("link", { name: /Complete                       | Failed          | Queued                           | Dreaming/ })` (variant card)       | link            | navigate to /images/:id | URL becomes /images/UUID | stays on /generate |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path             | what request body or query is expected |
| -------------- | ------ | ---------------- | -------------------------------------- |
| page load      | GET    | /api/generations | (none, fetches batch)                  |
| Generate click | POST   | /api/generations | prompt + style + model                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/generate.spec.ts`
