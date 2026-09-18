# Page observations: /geofences (Geofences)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~6 geofences (mix of depot/customer/restricted/service_area).

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                                                        | success signal                                     | failure signal              |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------- |
| `getByRole('heading', { name: /^geofences$/i, level: 1 })` | heading | page heading                                                                            | heading visible                                    | shell error                 |
| `getByText(/\\d+ zones/i)`                                 | text    | subheader shows total zone count from `/api/geofences`                                  | matches "6 zones"                                  | "0 zones"                   |
| `getByRole('button', { name: /\\+ new geofence/i })`       | button  | open the create dialog (role=dialog, aria-modal)                                        | dialog with heading "New geofence" rendered        | nothing happens             |
| `getByText(/\\d+ active zones/i)` (map overlay)            | text    | overlay caption on the placeholder map                                                  | matches `g.active === true` count                  | absent                      |
| First geofence card (`getByRole('article').first()`)       | article | renders icon + name + center + radius + rule + vehicles count + type chip + active flag | card visible with all parts                        | "Failed to load geofences." |
| First geofence type chip                                   | text    | reflects DB-canonical `geofences.kind`                                                  | one of {depot, customer, restricted, service_area} | "undefined"                 |
| First geofence "Vehicles" stat                             | text    | reflects `vehicles_assigned` count                                                      | numeric ≥ 0                                        | NaN                         |

## Hidden surfaces opened from this page

| trigger                        | what it opens                               | elements inside (selector / role / behavior)                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+ New geofence` button        | modal `role="dialog"` titled "New geofence" | name textbox (required), kind select (Allowed/Restricted), "Alert on enter" checkbox, "Alert on exit" checkbox (default true), Cancel button (closes dialog), Create submit button (POST /api/geofences then refetches list) |
| Click outside dialog (overlay) | closes dialog without submitting            | dialog removed                                                                                                                                                                                                               | dialog stays |

## Network calls expected during normal use

| trigger                   | method | path           | what request body or query is expected                                                             |
| ------------------------- | ------ | -------------- | -------------------------------------------------------------------------------------------------- |
| Initial mount             | GET    | /api/geofences | full geofence list                                                                                 |
| Submit "Create" in dialog | POST   | /api/geofences | `{ name, kind, polygon: [4 lat/lng vertices around (40.7,-74.0)], alert_on_enter, alert_on_exit }` |
| After successful POST     | GET    | /api/geofences | refetch — new row appears                                                                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/geofences.spec.ts`
