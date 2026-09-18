# Page observations: /pipelines/:id (PipelineDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role               | expected behavior on interaction        | success signal                   | failure signal        |
| ---------------------------------------------------------- | ------------------ | --------------------------------------- | -------------------------------- | --------------------- |
| `getByRole('link', { name: /All pipelines/i })`            | link               | navigates back to /pipelines            | URL becomes /pipelines           | stays on detail       |
| `getByRole('heading', { level: 1 })`                       | heading            | shows pipeline name (repo + branch)     | heading visible                  | absent                |
| metadata block (Commit + Branch + Duration + Triggered by) | text group         | shows pipeline metadata                 | all 4 fields visible             | any missing           |
| `getByRole('heading', { name: /^Stages$/i })`              | heading            | shows stages section                    | heading visible                  | absent                |
| stage `button[aria-expanded]`                              | button (accordion) | expands stage to show step list         | aria-expanded toggles to true    | toggle fails          |
| sidebar Coverage + Artifacts (when present)                | sidebar            | shows coverage % + attached artifacts   | both visible for passed pipeline | both absent           |
| GET /api/pipelines/:id (state survives reload)             | API                | re-fetch on page reload preserves state | URL + heading match after reload | reload navigates away |

## Hidden surfaces opened from this page

| trigger            | what it opens       | elements inside (selector / role / behavior) |
| ------------------ | ------------------- | -------------------------------------------- |
| Click stage button | stage detail (logs) | step list with statuses + durations          |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| Page load | GET    | /api/pipelines/:id | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pipelines__id.spec.ts`
