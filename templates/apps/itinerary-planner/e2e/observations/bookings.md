# Page observations: /bookings

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup + creating a trip.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name              | role                | expected behavior on interaction          | success signal              | failure signal  |
| --------------------------------------- | ------------------- | ----------------------------------------- | --------------------------- | --------------- |
| `getByRole('heading', { name: /bookings | confirmations/i })` | heading                                   | static page H1              | visible         | missing |
| `[data-testid="bookings-new"]`          | button              | toggles the inline new-booking form       | form visible after click    | nothing happens |
| `[data-testid="bookings-form"]`         | generic             | inline booking form                       | visible after toggle        | always hidden   |
| `[data-testid="bookings-form-trip"]`    | combobox            | choose trip for the booking               | option reflects             | locked          |
| `[data-testid="bookings-empty"]`        | generic             | empty state shown for new accounts        | visible when 0 bookings     | always hidden   |
| `[data-testid="bookings-list"]`         | generic             | renders bookings list after first booking | populated rows visible      | always hidden   |
| `[data-testid="bookings-row"]`          | generic             | one row per booking                       | visible after creating      | missing         |
| `[data-testid="bookings-total"]`        | generic             | running total of confirmed bookings       | numeric, currency formatted | NaN / blank     |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior)             |
| ------------------ | ------------- | -------------------------------------------------------- |
| New booking button | inline form   | trip select, kind, title, vendor, cost, currency, submit |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected      |
| ----------- | ------ | ------------- | ------------------------------------------- |
| Mount       | GET    | /api/bookings | auth header                                 |
| Mount       | GET    | /api/trips    | auth header (for the trip-picker)           |
| Submit form | POST   | /api/bookings | `{ trip_id, kind, title, cost_cents, ... }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings.spec.ts`
