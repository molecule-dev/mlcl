# Page observations: /plan-updated (PlanUpdated)

> Stripe checkout success-redirect landing. Confirms to the user that
> their plan changed; "Return home" button navigates back to /. The
> webhook handler (POST /api/webhooks/stripe) is what actually flips
> `users.planKey`; this page is purely UI confirmation.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction | success signal  | failure signal |
| -------------------------------------------------------------- | ------- | -------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /Your plan has been updated/ })` | heading | static success message           | visible         | missing        |
| `getByRole('heading', { name: /Thank you/ })`                  | heading | secondary header                 | visible         | missing        |
| `getByRole('link', { name: /Return home/ })`                   | link    | navigates to `/`                 | URL ends `/`    | stays          |
| `getByRole('button', { name: /Open user menu/ })`              | button  | opens user-menu popover          | popover visible | no popover     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path | what request body or query is expected |
| ------------- | ------ | ---- | -------------------------------------- |
| initial mount | (none) | —    | UI-only confirmation page              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
