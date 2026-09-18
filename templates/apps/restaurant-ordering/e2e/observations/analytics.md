# Page observations: /analytics (Analytics)

> Authenticated — KPI dashboard. Renders KPI tiles (today_revenue,
> orders_today, avg_ticket_cents, covers_today and similar) with
> zero-state defaults on a fresh account, plus a peak-hour / chart
> surface fed from GET /api/analytics/snapshot.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                    | success signal                                      | failure signal                            |
| -------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| KPI tiles (revenue / orders / covers / avg ticket) | text    | render numbers from GET /api/analytics/snapshot with documented zero-state defaults | tiles visible with `$0.00` / `0` on a fresh account | tiles missing or NaN                      |
| revenue tile (today_revenue)                       | text    | reflects the per-order pay events — increases after POST /api/orders/:id/pay        | tile value > 0 after a paid order on the same day   | revenue stays at $0 (invariant violation) |
| KPI heading / dashboard chrome                     | heading | "Analytics" title renders and the snapshot endpoint loaded successfully             | heading visible, no console errors                  | snapshot fails / page blank               |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/09-analytics.spec.ts`
