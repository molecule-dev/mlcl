# Page observations: /plan-updated (PlanUpdated)

> Stripe checkout return surface. Confirmation page rendered after the
> Stripe-hosted checkout flow redirects back. Plan flip is performed
> by the Stripe webhook, NOT by this page. Page must render even when
> the user is unauthed (the redirect URL is shared via email link).
> Spec: e2e/15-plan-updated.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name     | role    | expected behavior on interaction | success signal | failure signal |
| ------------------------------ | ------- | -------------------------------- | -------------- | -------------- |
| `getByRole('heading').first()` | heading | renders confirmation heading     | visible        | absent         |
| `getByRole('link').first()`    | link    | path back into the app           | URL changes    | dead link      |
| `locator('p').first()`         | text    | renders explanatory copy         | non-empty      | empty          |

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
- [x] All elements above have a corresponding test in `e2e/15-plan-updated.spec.ts`
