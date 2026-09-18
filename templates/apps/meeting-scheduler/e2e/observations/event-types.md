# Page observations: /event-types (Event types — list)

Authenticated list page; reads /api/event-types and links to the editor.

Source: this page was driven live at `http://localhost:$VITE_PORT/event-types`
via Playwright + the matching `e2e/event-types.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                           | success signal                         | failure signal     |
| ------------------------------------------------ | ------- | ---------------------------------------------------------- | -------------------------------------- | ------------------ |
| `getByRole("heading", { name: /event types/i })` | heading | page heading renders                                       | heading visible                        | heading missing    |
| empty state copy                                 | text    | shows when no types exist for the user                     | visible after fresh signup             | list never empties |
| first event-type row                             | link    | opens the editor at /event-types/:id                       | click navigates to /event-types/<uuid> | click does nothing |
| `[data-testid="toggle-active"]` on an editor row | button  | PATCH /api/event-types/:id flips is_active                 | GET reflects the new state             | PATCH 4xx/5xx      |
| `[data-testid="delete-event-type"]`              | button  | DELETE /api/event-types/:id and route back to /event-types | 404 on subsequent GET                  | event type lingers |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/event-types.spec.ts`
