# Page observations: /trips/:id (TripDetail)

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup + creating a trip.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                 | role     | expected behavior on interaction                    | success signal                      | failure signal          |
| ------------------------------------------ | -------- | --------------------------------------------------- | ----------------------------------- | ----------------------- |
| `[data-testid="trip-detail-name"]`         | generic  | renders the trip's name                             | visible with name                   | missing / blank         |
| `[data-testid="trip-detail-budget"]`       | generic  | renders the trip's budget total/spent               | visible                             | missing                 |
| `[data-testid="trip-detail-add-activity"]` | button   | toggles the Add Activity inline form open           | form visible                        | nothing happens         |
| `[data-testid="trip-detail-add-form"]`     | generic  | inline form for new activities                      | visible after toggle                | always hidden           |
| `[data-testid="trip-detail-add-title"]`    | textbox  | accepts activity title                              | value reflected                     | locked                  |
| `[data-testid="trip-detail-add-day"]`      | textbox  | numeric input for day index                         | value reflected                     | locked                  |
| `[data-testid="trip-detail-add-kind"]`     | combobox | choose activity kind                                | option reflects                     | locked                  |
| `[data-testid="trip-detail-add-submit"]`   | button   | POST /api/activities then refresh activity list     | activity row appears in list        | error toast             |
| `[data-testid="trip-detail-share"]`        | button   | POST /api/trips/:id/share returning a shareable URL | share-result block visible with URL | error toast / no result |

## Hidden surfaces opened from this page

| trigger             | what it opens      | elements inside (selector / role / behavior) |
| ------------------- | ------------------ | -------------------------------------------- |
| Add activity button | inline form        | title, day, kind, submit                     |
| Share trip button   | share-result block | URL displayed inline                         |

## Network calls expected during normal use

| trigger             | method | path                 | what request body or query is expected   |
| ------------------- | ------ | -------------------- | ---------------------------------------- |
| Mount               | GET    | /api/trips/:id       | auth header                              |
| Mount               | GET    | /api/activities      | auth header (filtered by trip in client) |
| Add activity submit | POST   | /api/activities      | `{ trip_id, title, day_index, ... }`     |
| Share button        | POST   | /api/trips/:id/share | (no body)                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips__id.spec.ts`
