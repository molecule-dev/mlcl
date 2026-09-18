# Page observations: /projects/:id/export (Export)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` after creating
> a project.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); project created beforehand

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                   | success signal                                                   | failure signal               |
| ----------------------------------------------------- | ------- | -------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /Export/i, level: 1 })` | heading | render export heading                              | visible                                                          | absent                       |
| `getByRole('button', { name: /CSS Keyframes/i })`     | button  | switch chosen format to css                        | "Export as CSS" CTA appears                                      | CTA stays unchanged          |
| `getByRole('button', { name: /Lottie JSON/i })`       | button  | switch chosen format to lottie                     | "Export as LOTTIE" CTA appears                                   | CTA stays unchanged          |
| `getByRole('button', { name: /Animated SVG/i })`      | button  | switch chosen format to svg                        | "Export as SVG" CTA appears                                      | CTA stays unchanged          |
| `getByRole('button', { name: /^Standard$/i })`        | button  | switch chosen quality preset                       | data-mol-quality changes                                         | quality unchanged            |
| `getByRole('button', { name: /^Optimized$/i })`       | button  | switch chosen quality preset                       | data-mol-quality changes                                         | quality unchanged            |
| `getByRole('button', { name: /Play preview/i })`      | button  | start a local preview animation (no network)       | preview state toggles                                            | preview never starts         |
| `getByRole('button', { name: /Export as/i })`         | button  | POST /api/exports; render artifact + completed row | GET /api/exports?projectId returns new row with status=completed | row stays "rendering" or 5xx |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                         | method | path                      | what request body or query is expected |
| ------------------------------- | ------ | ------------------------- | -------------------------------------- |
| page load                       | GET    | /api/exports              | ?projectId=:id                         |
| Export click                    | POST   | /api/exports              | { projectId, format, quality }         |
| Download click on completed row | GET    | /api/exports/:id/download | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id_export.spec.ts`
