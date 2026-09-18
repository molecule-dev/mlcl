# Page observations: /forgot-password

> Anonymous forgot-password form. Submits POST /api/users/forgot-password.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name | role            | expected behavior on interaction                      | success signal              | failure signal |
| -------------------------- | --------------- | ----------------------------------------------------- | --------------------------- | -------------- |
| Email input                | textbox (email) | accepts an email                                      | value reflected             | rejected       |
| Submit button              | button          | POSTs /api/users/forgot-password (issues reset token) | captureNetwork records POST | no request     |
| "Back to sign in" link     | link            | navigates to /login                                   | URL becomes /login          | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path                       | expected body |
| ------- | ------ | -------------------------- | ------------- |
| Submit  | POST   | /api/users/forgot-password | { email }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-forgot-password.spec.ts
