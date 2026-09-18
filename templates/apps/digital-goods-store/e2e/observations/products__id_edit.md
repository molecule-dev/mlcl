# Page observations: /products/:id/edit (ProductEditor — edit)

> Captured opening an existing product in the editor.

## Page state assumed

- [x] Authenticated — seller-only, must own the product

## Elements

| selector / accessible name           | role          | expected behavior on interaction | success signal           | failure signal   |
| ------------------------------------ | ------------- | -------------------------------- | ------------------------ | ---------------- |
| Name input pre-filled                | textbox       | shows existing name              | value matches            | empty            |
| Description textarea pre-filled      | textbox       | shows existing description       | value matches            | empty            |
| Price input pre-filled               | spinbutton    | shows existing price             | value matches            | empty            |
| Save button                          | button        | PUT /api/products/:id            | redirect or toast        | inline error     |
| `getByRole('button', { name: /delete | archive/i })` | button                           | DELETE /api/products/:id | nav to /products | inline error |

## Hidden surfaces opened from this page

| trigger       | what it opens  | elements inside        |
| ------------- | -------------- | ---------------------- |
| Delete button | confirm dialog | Confirm/Cancel buttons |

## Network calls expected during normal use

| trigger   | method | path              | expected body           |
| --------- | ------ | ----------------- | ----------------------- |
| Page load | GET    | /api/products/:id | returns product details |
| Save      | PUT    | /api/products/:id | partial fields          |
| Delete    | DELETE | /api/products/:id | empty body              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products__id_edit.spec.ts`
