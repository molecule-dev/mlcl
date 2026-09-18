# Page observations: /orders (Orders)

> Authed orders list — GET /api/orders.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name                  | role     | expected behavior on interaction | success signal            | failure signal     |
| ------------------------------------------- | -------- | -------------------------------- | ------------------------- | ------------------ |
| `page.locator('[name="Search orders..."]')` | textbox  | accepts text input               | value reflects typed text | value not retained |
| `page.locator('[name="Filter by status"]')` | combobox | accepts select-one input         | value reflects typed text | value not retained |
| `page.locator('a[href="/"]')`               | link     | navigates to /                   | URL updates to new path   | URL unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path        | expected body |
| ----------- | ------ | ----------- | ------------- |
| view orders | GET    | /api/orders | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders.spec.ts`
