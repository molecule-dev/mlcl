# Page observations: /products (Products)

> Captured from a creator with one or more products.

## Page state assumed

- [x] Authenticated — seller's own product catalog

## Elements

| selector / accessible name                       | role              | expected behavior on interaction | success signal                 | failure signal            |
| ------------------------------------------------ | ----------------- | -------------------------------- | ------------------------------ | ------------------------- |
| Page title "Your products"                       | heading           | identifies the page              | h1 visible                     | missing                   |
| `getByRole('link', { name: /add product          | new product/i })` | link                             | nav to /products/new           | URL becomes /products/new | no nav |
| Product row                                      | row               | shows name, price, status        | row visible                    | missing                   |
| Empty-state CTA                                  | link              | nav to /products/new             | URL becomes /products/new      | no nav                    |
| `getByRole('link', { name: /edit/i })` (per row) | link              | nav to /products/:id/edit        | URL becomes /products/:id/edit | no nav                    |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside |
| ------------------ | ------------- | --------------- |
| (none — flat list) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                    | expected body                     |
| --------- | ------ | ----------------------- | --------------------------------- |
| Page load | GET    | /api/products?mine=true | returns own products incl. drafts |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products.spec.ts`
