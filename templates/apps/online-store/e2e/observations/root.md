# Page observations: / (Storefront)

> Storefront landing — bestsellers, new arrivals, categories, add-to-cart.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                     | role   | expected behavior on interaction   | success signal            | failure signal                |
| -------------------------------------------------------------- | ------ | ---------------------------------- | ------------------------- | ----------------------------- |
| `page.locator('[data-mol-id="add-to-cart-704f49ec-102f-4ebf-8` | button | click triggers the action labelled | state changes accordingly | no state change / error toast |
| `page.locator('button:has-text("Privacy Policy")')`            | button | click triggers the action labelled | state changes accordingly | no state change / error toast |
| `page.locator('button:has-text("Terms of Service")')`          | button | click triggers the action labelled | state changes accordingly | no state change / error toast |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                    | method | path                         | expected body |
| -------------------------- | ------ | ---------------------------- | ------------- |
| view/update cart           | GET    | /api/cart                    | —             |
| render storefront sections | GET    | /api/storefront/categories   | —             |
| render storefront sections | GET    | /api/storefront/bestsellers  | —             |
| render storefront sections | GET    | /api/storefront/new-arrivals | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
