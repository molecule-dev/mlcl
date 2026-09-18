# Page observations: /shop/:slug (ProductDetail)

> Captured from rendered page after navigating to /shop/aurora-ui-kit (or another seed slug).

## Page state assumed

- [x] Public — anyone can view a product detail page

## Elements

| selector / accessible name                      | role           | expected behavior on interaction | success signal                                 | failure signal        |
| ----------------------------------------------- | -------------- | -------------------------------- | ---------------------------------------------- | --------------------- |
| Product cover image                             | img            | renders from `cover_image` URL   | img loaded                                     | broken image          |
| Product name + price                            | heading        | shows from /api/products/:slug   | h1 visible                                     | empty/missing         |
| `getByRole('button', { name: /add to cart/i })` | button         | adds to cart and shows mini-cart | cart count increments                          | no change             |
| `getByRole('button', { name: /buy now           | checkout/i })` | button                           | navigates to /checkout (or to Stripe directly) | URL becomes /checkout | no nav |
| Tag chips                                       | text           | render product tags              | chips visible                                  | empty                 |

## Hidden surfaces opened from this page

| trigger             | what it opens    | elements inside            |
| ------------------- | ---------------- | -------------------------- |
| Cart icon in header | mini cart drawer | line items + checkout link |

## Network calls expected during normal use

| trigger   | method | path                | expected body          |
| --------- | ------ | ------------------- | ---------------------- |
| Page load | GET    | /api/products/:slug | returns single product |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/shop__slug.spec.ts`
