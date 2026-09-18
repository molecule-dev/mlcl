# Page observations: /host/reservations (Reservation queue)

Tabbed reservation queue (Pending / Confirmed / History) for the host's
listings. Pending rows surface Approve / Decline buttons that hit
`PUT /api/bookings/:id/confirm` and `PUT /api/bookings/:id/cancel`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seed adds a
      pending reservation against the seeded host listing)

## Elements

| selector / accessible name                          | role   | expected behavior on interaction                                                         | success signal                             | failure signal            |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- |
| Tab `getByRole('tab', { name: /pending/i })`        | tab    | switch to pending list                                                                   | aria-selected=true; pending rows visible   | tab unchanged             |
| Tab `getByRole('tab', { name: /confirmed/i })`      | tab    | switch to confirmed list                                                                 | aria-selected=true; confirmed rows visible | tab unchanged             |
| `getByRole('button', { name: /approve/i }).first()` | button | PUT /api/bookings/:id/confirm; subsequent GET shows status=confirmed                     | row moves to Confirmed tab                 | request fails / row stays |
| `getByRole('button', { name: /decline/i }).first()` | button | PUT /api/bookings/:id/cancel { reason: 'host_declined' }; subsequent GET shows cancelled | row moves to History tab                   | request fails             |
| Empty-state copy when nothing in queue              | text   | rendered when visible.length === 0                                                       | "Nothing in this queue."                   | wrong copy                |

## Hidden surfaces opened from this page

(none — flat tabbed list)

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected      |
| ------------- | ------ | ------------------------- | ------------------------------------------- |
| initial mount | GET    | /api/reservations         | 200 with `{ data: Reservation[] }`          |
| approve       | PUT    | /api/bookings/:id/confirm | 200 → host_payouts row created in `pending` |
| decline       | PUT    | /api/bookings/:id/cancel  | { reason: 'host_declined' } → 200           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/host_reservations.spec.ts`
