# Page observations: /plan-updated (Stripe success landing)

Stripe Checkout sends users to this URL after a successful subscription
update. Just shows a confirmation card and a return-home link.

## Page state assumed

- [x] Authenticated (Stripe Checkout requires a logged-in user)

## Elements

| selector / accessible name                        | role      | expected behavior on interaction              | success signal                    | failure signal         |
| ------------------------------------------------- | --------- | --------------------------------------------- | --------------------------------- | ---------------------- |
| `[data-mol-id="page-plan-updated"]`               | container | top-level wrapper renders                     | visible after auth                | redirected to `/login` |
| `getByRole('heading')` (h1/h2)                    | heading   | confirmation message ("Subscription updated") | heading visible                   | empty body             |
| `[data-mol-id="plan-updated-back"]`               | link      | navigates back to `/`                         | URL becomes `/` (or `/dashboard`) | clicking does nothing  |
| `getByText(/dashboard/i)` (subtitle / icon block) | text      | renders confirmation supporting copy          | text visible                      | empty pane             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                                                          | method | path | what request body or query is expected |
| ---------------------------------------------------------------- | ------ | ---- | -------------------------------------- |
| (none) — purely a confirmation page; the webhook lives elsewhere |        |      |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-plan-updated.spec.ts`
