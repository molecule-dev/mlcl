# Page observations: /vehicles/:id (Vehicle detail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).
- [x] `:id` resolves to a real seeded vehicle (use the first row from `/vehicles` list).

## Elements

| selector / accessible name                     | role      | expected behavior on interaction                                                      | success signal                                         | failure signal               |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `getByRole('link', { name: /all vehicles/i })` | link      | navigate back to `/vehicles`                                                          | URL ends with `/vehicles`                              | stays                        |
| `getByText(/^vehicle$/i)` (header eyebrow)     | text      | uppercase "Vehicle" eyebrow                                                           | visible                                                | absent                       |
| `getByRole('heading', { level: 1 })`           | heading   | shows the vehicle plate (font-mono)                                                   | non-empty plate                                        | empty / "Vehicle not found." |
| Header subtitle text                           | text      | shows `<year> <make> <model> · <vehicle_type>`                                        | matches `/\\d{4} \\w+/`                                | empty                        |
| VIN text                                       | text      | `VIN: <vin>`                                                                          | non-empty VIN                                          | empty                        |
| Status chip (top-right of header)              | text      | reflects DB-canonical `vehicles.status`                                               | one of {operational, in_transit, idle, alert, offline} | "undefined"                  |
| Stat card: Odometer                            | text      | displays `vehicle.odometer` mi                                                        | numeric                                                | NaN                          |
| Stat card: Speed                               | text      | displays `vehicle.speed_mph` mph                                                      | numeric (≥0)                                           | NaN                          |
| Stat card: Fuel                                | text      | displays `vehicle.fuel_pct` %; coloured `text-error` if `< 20`                        | numeric ≥0 ≤100                                        | NaN                          |
| Stat card: Engine                              | text      | displays `vehicle.engine_temp` °F; coloured `text-error` if `> 220`                   | numeric                                                | NaN                          |
| Map placeholder caption                        | text      | `<location> · live`                                                                   | matches non-empty location                             | absent                       |
| Assigned driver section                        | text/link | shows driver link (when assigned) → `/drivers/<driver_id>`; or "No driver assigned."  | link OR fallback text                                  | empty section                |
| Maintenance section                            | text      | "Next service: N mi" + "Due in N mi" derived from `next_maintenance_miles - odometer` | both lines visible                                     | absent                       |
| Recent trips list                              | list      | up to 6 most-recent trips for this vehicle                                            | at least one row when seeded                           | empty list                   |
| Recent-trip row "origin → destination"         | text      | `t.origin → t.destination` from `/api/trips?vehicle_id=:id`                           | non-empty origin AND destination                       | "→" with empty sides         |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — read-only detail) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger                  | method | path                      | what request body or query is expected            |
| ------------------------ | ------ | ------------------------- | ------------------------------------------------- |
| Initial mount            | GET    | /api/vehicles/:id         | shaped vehicle including odometer/speed/fuel/etc. |
| Initial mount (parallel) | GET    | /api/trips?vehicle_id=:id | trips filtered by vehicle, top 6 displayed        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vehicles.spec.ts` (detail-section)
