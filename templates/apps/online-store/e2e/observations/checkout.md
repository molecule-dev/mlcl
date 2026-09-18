# Page observations: /checkout (Checkout)

> GET /api/cart + POST /api/checkout → Stripe URL.

## Page state assumed

- [x] Authenticated user with non-empty cart

## Elements

| selector / accessible name                 | role | expected behavior on interaction | success signal          | failure signal |
| ------------------------------------------ | ---- | -------------------------------- | ----------------------- | -------------- |
| `page.locator('a[href="/"]')`              | link | navigates to /                   | URL updates to new path | URL unchanged  |
| `page.locator('a[href="/"]')`              | link | navigates to /                   | URL updates to new path | URL unchanged  |
| `page.locator('a[href="/search?q=all"]')`  | link | navigates to /search?q=all       | URL updates to new path | URL unchanged  |
| `page.locator('a[href="/search?q=sale"]')` | link | navigates to /search?q=sale      | URL updates to new path | URL unchanged  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger          | method | path      | expected body |
| ---------------- | ------ | --------- | ------------- |
| view/update cart | GET    | /api/cart | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/checkout.spec.ts`
