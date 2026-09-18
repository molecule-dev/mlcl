# Page observations: /reset-password

> Public form, requires a `token` query param. Submits new password to
> /api/reset_password.

## Page state assumed

- [x] Public, requires `?token=...`

## Elements

| selector / accessible name          | role               | expected behavior on interaction | success signal                  | failure signal |
| ----------------------------------- | ------------------ | -------------------------------- | ------------------------------- | -------------- |
| `getByRole("heading")`              | heading            | page heading visible             | visible                         | empty          |
| `[data-mol-id="reset-password"]`    | textbox (password) | accepts password                 | value reflected                 | rejected       |
| `[data-mol-id="reset-confirm"]`     | textbox (password) | confirms password                | value reflected                 | rejected       |
| `[data-mol-id="reset-submit"]`      | button             | POST /api/reset_password         | success message + nav to /login | error visible  |
| `getByText(/passwords? do not match | do not match/i)`   | label                            | shown when fields disagree      | visible        | absent |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path                | expected body                   |
| ------------ | ------ | ------------------- | ------------------------------- |
| submit click | POST   | /api/reset_password | { token, password } → 200 / 400 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-reset-password.spec.ts`
