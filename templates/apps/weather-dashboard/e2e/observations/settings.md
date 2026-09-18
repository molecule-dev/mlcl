# Page observations: /settings (Tune your dashboard)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                             | role          | expected behavior on interaction                                                     | success signal                                                   | failure signal               |
| ---------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /tune your dashboard/i })`               | heading       | render the page title                                                                | visible                                                          | absent                       |
| `main` (4 section nav buttons)                                         | nav           | switch active section to Units / Notifications / Appearance / Data sources           | clicked button gets aria-pressed=true + relevant section visible | aria-pressed unchanged       |
| `[data-setting-key="units.temperature"][data-setting-value="Celsius"]` | option button | flip preferred temp unit to Celsius — persisted via localStorage and survives reload | aria-pressed flips + value persisted                             | reload reverts to Fahrenheit |
| `[data-setting-key="units.wind"][data-setting-value="km/h"]`           | option button | flip wind unit to km/h                                                               | aria-pressed=true + persisted                                    | reload reverts               |
| `[data-setting-key="notifications.severeWarning"]`                     | toggle        | flip severe-warning notifications on/off                                             | aria-pressed flips + persisted                                   | reload reverts               |
| `[data-setting-key="notifications.dailyDigest"]`                       | toggle        | flip daily digest on/off                                                             | aria-pressed flips + persisted                                   | reload reverts               |
| `[data-setting-key="appearance.theme"][data-setting-value="Light"]`    | option button | flip theme preference to Light                                                       | aria-pressed=true + persisted                                    | reload reverts               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior)     |
| ------- | ------------- | ------------------------------------------------ |
| (none)  | —             | settings is flat — radio-style buttons + toggles |

## Network calls expected during normal use

| trigger    | method | path                | what request body or query is expected                           |
| ---------- | ------ | ------------------- | ---------------------------------------------------------------- |
| page load  | (none) | (localStorage-only) | `localStorage["weather-dashboard.settings.v1"]` is read on mount |
| Any change | (none) | (localStorage-only) | same key is written on every state change                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
