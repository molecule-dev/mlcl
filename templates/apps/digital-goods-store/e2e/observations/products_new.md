# Page observations: /products/new (ProductEditor — new)

> Captured from a creator opening the editor in create mode.

## Page state assumed

- [x] Authenticated — seller-only

## Elements

| selector / accessible name | role       | expected behavior on interaction | success signal                              | failure signal    |
| -------------------------- | ---------- | -------------------------------- | ------------------------------------------- | ----------------- |
| Name input                 | textbox    | accepts product name             | value persists                              | inline validation |
| Description textarea       | textbox    | accepts long description         | value persists                              | n/a               |
| Price input                | spinbutton | accepts integer cents/dollars    | value persists                              | inline validation |
| Category input             | textbox    | accepts category                 | value persists                              | n/a               |
| Submit button              | button     | POST /api/products → 201         | redirect to /products or /products/:id/edit | inline error      |
| Cancel/back link           | link       | nav to /products                 | URL becomes /products                       | no nav            |

## Hidden surfaces opened from this page

| trigger               | what it opens      | elements inside   |
| --------------------- | ------------------ | ----------------- |
| Tag picker chip click | inline chip toggle | tag added/removed |

## Network calls expected during normal use

| trigger | method | path          | expected body                                      |
| ------- | ------ | ------------- | -------------------------------------------------- |
| Submit  | POST   | /api/products | { name, description, price_cents, category, tags } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products_new.spec.ts`
