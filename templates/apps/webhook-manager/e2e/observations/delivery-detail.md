# Page observations: /deliveries/:id (DeliveryDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated; a delivery exists (created via send-test on an endpoint).

## Elements

| selector / accessible name                              | role             | expected behavior on interaction                                          | success signal                      | failure signal            |
| ------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------- | ----------------------------------- | ------------------------- |
| Delivery body (status pill + payload + response panels) | region           | render fields from /api/deliveries/:id including the captured request URL | server-stored values visible        | missing / hardcoded       |
| Not-found state for an unknown id                       | text             | renders the "delivery not found" body                                     | recognisable not-found text visible | crash / blank shell       |
| `getByRole('link', { name: /back                        | deliveries/i })` | link                                                                      | navigate to `/deliveries`           | URL becomes `/deliveries` | stays |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| Not-found state | error region  | renders when id does not exist for this user |

## Network calls expected during normal use

| trigger    | method | path                       | what request body or query is expected |
| ---------- | ------ | -------------------------- | -------------------------------------- |
| Page mount | GET    | /api/deliveries/:id        | hydrate delivery detail                |
| Replay     | POST   | /api/deliveries/:id/replay | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/delivery-detail.spec.ts`
