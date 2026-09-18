# Page observations: /components/:id (Component detail)

> Filled from a live walk via Playwright MCP at /components/:id. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role                             | expected behavior on interaction | success signal            | failure signal          |
| -------------------------------------------------- | -------------------------------- | -------------------------------- | ------------------------- | ----------------------- |
| `getByRole('heading', { name: <component name> })` | heading                          | render the component's name      | heading visible           | not rendered            |
| Status indicator (pill / badge)                    | text                             | reflect the current status       | matches DB                | mismatch                |
| `getByRole('link', { name: /components             | back/i })` (back to /components) | link                             | navigate to /components   | URL becomes /components | nav fails |
| GET /api/components/:id on load                    | network                          | fetch component detail           | 200 with component object | 4xx/5xx                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                        | what request body or query is expected  |
| --------- | ------ | --------------------------- | --------------------------------------- |
| Page load | GET    | /api/components/:id         | returns single component object         |
| Page load | GET    | /api/components/:id/history | returns status-history array (optional) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/19-components__id.spec.ts`
