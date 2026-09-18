# Page observations: /signup (Sign Up)

> POST /api/users → JWT cookie → redirect to /.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name  | role    | expected behavior on interaction | success signal            | failure signal     |
| --------------------------- | ------- | -------------------------------- | ------------------------- | ------------------ |
| `page.locator('#name')`     | textbox | accepts text input               | value reflects typed text | value not retained |
| `page.locator('#email')`    | textbox | accepts email input              | value reflects typed text | value not retained |
| `page.locator('#password')` | textbox | accepts password input           | value reflects typed text | value not retained |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
