# Page observations: /search (Search)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (browseable without auth)

## Elements

| selector / accessible name                        | role      | expected behavior on interaction | success signal              | failure signal |
| ------------------------------------------------- | --------- | -------------------------------- | --------------------------- | -------------- |
| `getByRole('searchbox')`                          | searchbox | filters by query string          | tutor list narrows on input | no change      |
| `getByRole('button', { name: /^all$/i })`         | button    | resets subject filter            | shows all tutors            | inert          |
| `getByRole('button', { name: /^Mathematics$/i })` | button    | filters by Mathematics subject   | tutor list narrows          | no narrowing   |
| `getByRole('button', { name: /^Science$/i })`     | button    | filters by Science               | filtered list               | no narrowing   |
| `getByRole('button', { name: /^Languages$/i })`   | button    | filters by Languages             | filtered list               | no narrowing   |
| `getByRole('button', { name: /^Coding$/i })`      | button    | filters by Coding                | filtered list               | no narrowing   |
| `getByRole('radio', { name: /any rating/i })`     | radio     | resets rating filter             | all tutors                  | inert          |
| `getByRole('radio', { name: /4★/i })`             | radio     | filters rating ≥4                | only 4+ tutors              | inert          |
| `getByRole('radio', { name: /4\.5/i })`           | radio     | filters rating ≥4.5              | only 4.5+                   | inert          |
| `getByRole('radio', { name: /4\.8/i })`           | radio     | filters rating ≥4.8              | only 4.8+ shown             | inert          |
| Tutor card link                                   | link      | go to /tutor/:id                 | URL contains /tutor/        | nav fails      |
| "X tutors match your filters"                     | text      | summary count visible            | count updates               | not rendered   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger          | method | path                                         | what request body or query is expected |
| ---------------- | ------ | -------------------------------------------- | -------------------------------------- |
| page load        | GET    | /api/tutors                                  | returns all 3 demo tutors              |
| typing in search | GET    | /api/tutors                                  | refires with q= query                  |
| subject pick     | client | filter applied locally to /api/tutors result | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
