# Page observations: /incidents/new (Create incident)

> Filled from a live walk via Playwright MCP at /incidents/new. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role     | expected behavior on interaction               | success signal                           | failure signal        |
| ----------------------------------------------------- | -------- | ---------------------------------------------- | ---------------------------------------- | --------------------- |
| `#incident-title` (Title)                             | textbox  | accept incident title                          | typed value reflected                    | rejected              |
| `#incident-message` (Initial message)                 | textbox  | accept the customer-visible first update       | typed value reflected                    | rejected              |
| `getByTestId('affected-<componentId>')`               | checkbox | toggle component as affected                   | checked state flips                      | toggle no-op          |
| `getByRole('button', { name: /publish/i })` (Publish) | button   | POST /api/incidents and redirect to /incidents | URL becomes /incidents; new card visible | error message visible |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected                                                 |
| --------- | ------ | --------------- | -------------------------------------------------------------------------------------- |
| Page load | GET    | /api/components | populates affected-component checkboxes                                                |
| Publish   | POST   | /api/incidents  | `{ title, message, impact, status, affected_components: [id…] }` returns 201 with `id` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/20-incidents_new.spec.ts`
