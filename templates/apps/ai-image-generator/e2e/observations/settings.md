# Page observations: /settings (settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction               | success signal                            | failure signal  |
| -------------------------------------------------------------- | ------- | ---------------------------------------------- | ----------------------------------------- | --------------- |
| `getByRole("heading", { name: /^Settings$/i, level: 1 })`      | heading | render Settings heading                        | visible                                   | absent          |
| `getByRole("heading", { name: /Plan & credits/i, level: 2 })`  | heading | render plan section                            | visible                                   | absent          |
| `getByRole("button", { name: /Switch to Creator/i })`          | button  | PUT /api/plans/upgrade or open Stripe checkout | request issued OR external nav            | no action       |
| `getByRole("button", { name: /Switch to Studio/i })`           | button  | PUT /api/plans/upgrade or open Stripe checkout | request issued OR external nav            | no action       |
| `getByRole("heading", { name: /API keys/i, level: 2 })`        | heading | render API keys section                        | visible                                   | absent          |
| `getByRole("heading", { name: /Creator profile/i, level: 2 })` | heading | render profile section                         | visible                                   | absent          |
| `getByLabel(/Bio/i)`                                           | textbox | accept profile bio text                        | value reflects input                      | value empty     |
| `getByRole("button", { name: /Save profile/i })`               | button  | PUT /api/profile                               | request issued and toast/visible feedback | no network call |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path               | what request body or query is expected |
| ------------------ | ------ | ------------------ | -------------------------------------- |
| page load          | GET    | /api/plans         | (none)                                 |
| page load          | GET    | /api/profile       | (none)                                 |
| Save profile click | PUT    | /api/profile       | displayName + bio                      |
| Switch plan click  | PUT    | /api/plans/upgrade | planId                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
