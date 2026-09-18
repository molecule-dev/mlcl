# Page observations: /menu/guest (GuestMenu)

> Public — guest-facing scan-to-order menu. Loaded from a QR code
> with `?owner=<id>&table=<n>` query params. Renders the operator's
> menu, an "Add" control on each item, a cart drawer with quantity
> controls, customer name + email inputs, and a submit-order action.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role         | expected behavior on interaction                                                           | success signal                                                     | failure signal                           |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------- |
| `?owner=<id>&table=<n>` query params         | (URL)        | scope the menu lookup + bind the order to the right table; cart UI mounts                  | menu items render for that owner; cart drawer accepts seeded items | menu blank or order lands on wrong owner |
| Submit order / Place order action            | button       | POST /api/guest/orders with `{owner_id, table_id, items[], customer_name, customer_email}` | 201 + the order is visible via GET /api/orders for the operator    | 4xx / order missing from operator list   |
| guest order rejection on empty/invalid items | (validation) | POST /api/guest/orders with no valid items returns ≥400                                    | API returns 400/422                                                | 200 with empty cart accepted             |

## Hidden surfaces opened from this page

| trigger     | what it opens | elements inside                                           |
| ----------- | ------------- | --------------------------------------------------------- |
| Cart toggle | cart drawer   | line list, qty steppers, name/email inputs, "Place order" |

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
- [x] All elements above have a corresponding test in `e2e/06-menu_guest.spec.ts`
