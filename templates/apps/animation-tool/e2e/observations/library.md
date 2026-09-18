# Page observations: /library (Library)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role    | expected behavior on interaction                                     | success signal                                        | failure signal               |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /Library/i, level: 1 })`               | heading | render library heading                                               | visible                                               | absent                       |
| easing preset `getByRole('button', { name: /Ease Out Quint/i })`     | button  | mark this easing as active in UI; show its bezier value              | active button has data-mol-active or distinct class   | no UI change                 |
| easing preset `getByRole('button', { name: /Ease In Out/i })`        | button  | mark this easing as active in UI                                     | active button changes                                 | no change                    |
| easing preset `getByRole('button', { name: /^Spring/i })`            | button  | mark this easing as active in UI                                     | active button changes                                 | no change                    |
| easing preset `getByRole('button', { name: /^Snap/i })`              | button  | mark this easing as active in UI                                     | active button changes                                 | no change                    |
| easing preset `getByRole('button', { name: /^Gentle/i })`            | button  | mark this easing as active in UI                                     | active button changes                                 | no change                    |
| easing preset `getByRole('button', { name: /^Bounce/i })`            | button  | mark this easing as active in UI                                     | active button changes                                 | no change                    |
| keyframe-template `getByRole('button', { name: /Insert/i }).first()` | button  | POST /api/keyframes against the latest project; show inserted status | next GET /api/keyframes?projectId returns the new row | row missing or alert visible |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                   | what request body or query is expected       |
| ------------ | ------ | ---------------------- | -------------------------------------------- |
| page load    | GET    | /api/library/easings   | (none)                                       |
| page load    | GET    | /api/library/templates | (none)                                       |
| page load    | GET    | /api/projects          | ?limit=1 (latest project)                    |
| Insert click | POST   | /api/keyframes         | { projectId, property, time, value, easing } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/library.spec.ts`
