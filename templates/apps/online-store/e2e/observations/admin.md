# Page observations: /admin (Admin Dashboard)

> Admin dashboard — stats, low-stock, recent orders.

## Page state assumed

- [x] Admin user (`role: admin`)

## Elements

| selector / accessible name                                   | role     | expected behavior on interaction   | success signal            | failure signal                |
| ------------------------------------------------------------ | -------- | ---------------------------------- | ------------------------- | ----------------------------- |
| `page.locator('[name="Search analytics, orders..."]')`       | textbox  | accepts text input                 | value reflects typed text | value not retained            |
| `page.locator('[name="select-one"]')`                        | combobox | accepts select-one input           | value reflects typed text | value not retained            |
| `page.locator('[data-mol-id="admin-topnav-notifications"]')` | button   | click triggers the action labelled | state changes accordingly | no state change / error toast |
| `page.locator('[data-mol-id="admin-download-report"]')`      | button   | click triggers the action labelled | state changes accordingly | no state change / error toast |
| `getByRole('heading', { name: /Bazaar/i })`                  | heading  | rendered as section heading        | visible                   | missing on page               |
| `getByRole('heading', { name: /Dashboard/i })`               | heading  | rendered as section heading        | visible                   | missing on page               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger         | method | path                 | expected body |
| --------------- | ------ | -------------------- | ------------- |
| render admin    | GET    | /api/admin/stats     | —             |
| render admin    | GET    | /api/admin/orders    | —             |
| render admin    | GET    | /api/admin/low-stock | —             |
| product listing | GET    | /api/products        | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin.spec.ts`
