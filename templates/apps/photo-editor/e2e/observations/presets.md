# Page observations: /presets (Presets)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up via `signup(page)` then `browser_navigate` → `/presets`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — category chips, preset tiles, empty/error states.
4. Click a category chip; observe the grid narrow.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/presets.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                       | role            | expected behavior on interaction                                                                          | success signal                                                       | failure signal                                |
| -------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| `[data-mol-id="presets-grid"]`                                                   | container       | shows preset tiles after `/api/filters/presets` resolves; built-ins (CONT/SAT/GRN labels) must be present | tile count > 0                                                       | grid empty / `presets-loading` never resolves |
| `[data-mol-id="presets-cat-mono"]` (and `all`/`mood`/`cinema`/`studio`/`street`) | button          | filters the grid to the chosen category; clicking narrows tile count                                      | filtered tile count ≤ unfiltered, OR `presets-empty` visible if zero | grid unchanged                                |
| backend invariant: POST `/api/filters/presets` then GET                          | (no UI element) | a user-created preset persists and round-trips through subsequent GET                                     | created preset visible in GET, with `user_id` set                    | not in GET / wrong owner                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | presets is fully visible at all times        |

## Network calls expected during normal use

| trigger                      | method | path                   | what request body or query is expected                                                             |
| ---------------------------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------- |
| (page load)                  | GET    | `/api/filters/presets` | array of `{ id, name, category, parameters, user_id }` rows; either system presets or user presets |
| user-preset save (test only) | POST   | `/api/filters/presets` | `{ name, parameters }` → 201                                                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/presets.spec.ts`
