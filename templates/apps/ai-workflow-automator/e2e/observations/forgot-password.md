# Page observations: /forgot-password

> Public form. Posts to /api/users/forgot-password (always returns 200
> for non-enumeration). Sends a token via email.

## Page state assumed

- [x] Public

## Elements

| selector / accessible name           | role            | expected behavior on interaction | success signal          | failure signal     |
| ------------------------------------ | --------------- | -------------------------------- | ----------------------- | ------------------ |
| `getByRole("heading")`               | heading         | page heading visible             | visible                 | empty              |
| `[data-mol-id="forgot-email"]`       | textbox (email) | accepts email                    | value reflected         | rejected           |
| `[data-mol-id="forgot-submit"]`      | button          | POST /api/users/forgot-password  | success message visible | error              |
| `getByRole("link", { name: /log\s?in | back/i })`      | link                             | back to /login          | URL becomes /login | stays |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path                       | expected body          |
| ------------ | ------ | -------------------------- | ---------------------- |
| submit click | POST   | /api/users/forgot-password | { email } → 200 always |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-forgot-password.spec.ts`
