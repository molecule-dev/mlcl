# Page observations: /plan-updated

> Observed via Playwright at http://localhost:3080/plan-updated — post-
> Stripe-checkout success landing rendered by `pages/PlanUpdated.tsx`.
> Stripe webhook flips users.planKey before the user gets here.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); typically arrived
      via a successful Stripe Checkout session redirect.

## Elements

| selector / accessible name                                 | role                         | expected behavior on interaction        | success signal              | failure signal         |
| ---------------------------------------------------------- | ---------------------------- | --------------------------------------- | --------------------------- | ---------------------- |
| Loading state `Spinner` (pre-auth-hydration)               | progressbar                  | brief render before auth state hydrates | visible momentarily         | infinite spinner       |
| `getByRole('heading').first()` (planUpdated.message)       | heading                      | renders the success message             | visible after auth hydrates | missing                |
| `getByRole('heading').last()` (planUpdated.thankYou)       | heading                      | renders the thank-you copy              | visible                     | missing                |
| `getByRole('link')` → `getByRole('button', { name: /return | home/i })` (Return home CTA) | link/button                             | navigates back to /         | URL becomes / or /home | unchanged |

## Hidden surfaces opened from this page

| trigger                           | what it opens | elements inside |
| --------------------------------- | ------------- | --------------- |
| (none — single confirmation page) | —             | —               |

## Network calls expected during normal use

| trigger                  | method | path                           | what request body or query is expected     |
| ------------------------ | ------ | ------------------------------ | ------------------------------------------ |
| Page load (auth hydrate) | GET    | /api/users/:id (via auth bond) | refresh user state (already authenticated) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/10-plan-updated.spec.ts`
