# Page observations: /plan-updated (PlanUpdated) — covered by 12-plan-updated.spec.ts

> Auth-protected confirmation surface reached after a successful Stripe
> Checkout completes and the user is redirected back. Renders a thank-you
> headline and a single Return-Home button that links to `/`. The page
> only renders once auth is initialized.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role      | expected behavior on interaction       | success signal | failure signal |
| -------------------------------------------- | --------- | -------------------------------------- | -------------- | -------------- |
| `getByRole('heading', { level: 2 }).first()` | heading   | renders the thank-you/welcome headline | visible        | empty          |
| `getByRole('link', { name: /home             | dashboard | return                                 | continue/i })` | link           | nav back to / (landing)                       | URL becomes /      | stays         |
| `getByRole('button', { name: /home           | dashboard | return                                 | continue/i })` | button         | inside the link wrapper, clickable affordance | clicking navigates | not clickable |

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
- [x] All elements above have a corresponding test in `e2e/12-plan-updated.spec.ts`
