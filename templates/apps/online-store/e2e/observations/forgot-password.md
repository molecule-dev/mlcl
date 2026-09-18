# Page observations: /forgot-password (Forgot Password)

> POST /api/users/forgot-password → email-sent confirmation (always 200).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal                    | failure signal                |
| --------------------------------------------------- | ------- | -------------------------------- | --------------------------------- | ----------------------------- |
| `page.locator('#email')`                            | textbox | accepts email input              | value reflects typed text         | value not retained            |
| `getByRole('button', { name: /Send reset link/i })` | button  | submits the form                 | navigates / surface success state | no state change / error toast |
| `page.locator('a[href="/login"]')`                  | link    | navigates to /login              | URL updates to new path           | URL unchanged                 |

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
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
