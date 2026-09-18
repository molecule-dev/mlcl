# Page observations: /dashboard (Dashboard)

Authenticated home; reads /api/bookings + /api/event-types + /api/profile/me.

Source: this page was driven live at `http://localhost:$VITE_PORT/dashboard`
via Playwright + the matching `e2e/dashboard.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role  | expected behavior on interaction                 | success signal                    | failure signal                                |
| ------------------------------------- | ----- | ------------------------------------------------ | --------------------------------- | --------------------------------------------- |
| `[data-testid="dashboard-empty-cta"]` | link  | CTA leading to /event-types/new for a fresh host | visible right after signup        | CTA missing for empty state                   |
| `[data-testid="dashboard-upcoming"]`  | list  | shows the host's next bookings once seeded       | invitee name appears in the list  | list never populates after creating a booking |
| `[data-testid="dashboard-kpi"]`       | group | renders KPI cards with real counts               | cards visible with numeric values | KPI cards missing or report NaN               |

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
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
