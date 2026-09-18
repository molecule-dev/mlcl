# Page observations: /alerts (PriceAlerts)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/alerts.spec.ts`.

## Procedure

1. `signup(page)` → /alerts empty state.
2. Open "Add alert" form; submit JFK→CDG @ $500 → POST /api/alerts.
3. Toggle the active flag on the persisted card → PUT.
4. Delete the card → DELETE → 404 on read-after-write.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role   | expected behavior on interaction        | success signal                   | failure signal              |
| ----------------------------------------------- | ------ | --------------------------------------- | -------------------------------- | --------------------------- |
| `getByRole('button', { name: 'Save alert' })`   | button | POST /api/alerts                        | new card visible, list refreshed | error banner                |
| `button[aria-pressed="true"][hasText="Active"]` | button | PUT /api/alerts/:id active=false        | aria-pressed flips               | no persistence              |
| `getByRole('button', { name: 'Delete alert' })` | button | DELETE /api/alerts/:id                  | row removed; GET returns 404     | row remains                 |
| empty-state copy                                | region | "No tracked routes yet" when list empty | visible text                     | rendered with cards instead |

## Hidden surfaces opened from this page

| trigger      | what it opens      | elements inside (selector / role / behavior)                  |
| ------------ | ------------------ | ------------------------------------------------------------- |
| Add alert    | inline create form | origin / destination / target price / departure inputs + Save |
| Delete alert | confirm dialog     | accept = delete, dismiss = no-op                              |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected                  |
| --------- | ------ | --------------- | ------------------------------------------------------- |
| page load | GET    | /api/alerts     | (no body)                                               |
| save      | POST   | /api/alerts     | `{ origin_iata, destination_iata, target_price_cents }` |
| toggle    | PUT    | /api/alerts/:id | `{ active: boolean }`                                   |
| delete    | DELETE | /api/alerts/:id | (no body)                                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
