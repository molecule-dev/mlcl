# Page observations: /forgot-password (Forgot password)

> Public — single-field form that POSTs to the user-resource forgot
> password handler. On 2xx, the form replaces itself with a "check your
> inbox" success banner. Endpoint is enumeration-safe (returns 2xx
> regardless of whether the email is in the DB).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name   | role    | expected behavior on interaction                                                      | success signal                        | failure signal                |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------- |
| `input[type="email"]`        | textbox | accepts email                                                                         | input value updates                   | read-only                     |
| `form button[type="submit"]` | button  | POST /api/users/forgot-password with `{ email }`; on 2xx swaps form for success state | "check your inbox"-style text appears | error alert / no network call |
| `a[href="/login"]`           | link    | nav back to /login                                                                    | URL becomes `/login`                  | broken link                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected   |
| ------- | ------ | -------------------------- | ---------------------------------------- |
| submit  | POST   | /api/users/forgot-password | `{ email }`; 200 even for unknown emails |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
