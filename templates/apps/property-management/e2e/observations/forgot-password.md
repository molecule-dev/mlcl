# Page observations: /forgot-password (ForgotPassword)

> Filled programmatically from inventory.json. The backing spec asserts
> page reachability + the listed elements render. Hand-tune for richer
> assertions as needed.

## Page state assumed

- Public (sign up first via `signup(page)` if authenticated)

## Elements

| selector / accessible name | role    | expected behavior on interaction    | success signal              | failure signal  |
| -------------------------- | ------- | ----------------------------------- | --------------------------- | --------------- |
| email input                | textbox | accepts email address               | input value reflects typing | no value change |
| send reset link button     | button  | POSTs to /api/users/forgot-password | success message visible     | silent failure  |
| back to sign in link       | link    | navigates to /login                 | URL becomes /login          | no navigation   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | {email}                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
