# Page observations: /host (Host Dashboard)

Hosting overview — earnings hero (last 30 days, YTD, occupancy %),
queue summary (requests / arrivals / active listings), pending
reservation queue, and upcoming arrivals. Reads
`GET /api/host-listings` and `GET /api/reservations`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seed
      populates a sample host listing + reservation for fresh users)

## Elements

| selector / accessible name                                                              | role | expected behavior on interaction               | success signal                 | failure signal  |
| --------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- | ------------------------------ | --------------- |
| `getByRole('link', { name: /review queue/i })`                                          | link | navigate to /host/reservations                 | URL becomes /host/reservations | no navigation   |
| `getByRole('link', { name: /see all/i })`                                               | link | navigate to /host/reservations (request queue) | URL becomes /host/reservations | no navigation   |
| Reservation request row link `getByRole('link').filter({ hasText: /awaiting reply/i })` | link | navigate to /host/reservations                 | URL becomes /host/reservations | broken          |
| Hero earnings stat (last 30 days)                                                       | text | dollar value rendered tabular-nums             | non-empty $ string             | undefined / NaN |
| Occupancy % stat                                                                        | text | percentage 0–100%                              | renders integer with %         | wrong format    |

## Hidden surfaces opened from this page

(none — read-only dashboard)

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| initial mount | GET    | /api/host-listings | 200 with `{ data: HostListing[] }`     |
| initial mount | GET    | /api/reservations  | 200 with `{ data: Reservation[] }`     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/host.spec.ts`
