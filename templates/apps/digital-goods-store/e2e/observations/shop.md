# Page observations: /shop (Storefront)

> Captured from rendered page after navigating to /shop.

## Page state assumed

- [x] Public — anyone can browse the storefront

## Elements

| selector / accessible name     | role    | expected behavior on interaction   | success signal              | failure signal  |
| ------------------------------ | ------- | ---------------------------------- | --------------------------- | --------------- |
| Search input                   | textbox | filters product list as user types | rendered list narrows       | no filter       |
| Category chip buttons          | button  | filter products by category        | active chip + filtered list | nothing changes |
| Product card link              | link    | navigates to /shop/:slug           | URL becomes /shop/:slug     | no nav          |
| "Add to cart" button on a card | button  | adds product to local cart         | cart count increments       | no change       |
| Cart drawer link in header     | link    | nav to /cart                       | URL becomes /cart           | no nav          |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside                 |
| --------------- | ------------- | ------------------------------- |
| Hover over card | hover state   | quick-look footer (price, type) |

## Network calls expected during normal use

| trigger         | method | path                     | expected body           |
| --------------- | ------ | ------------------------ | ----------------------- |
| Page load       | GET    | /api/products            | returns active products |
| Category filter | GET    | /api/products?category=X | filtered list           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/shop.spec.ts`
