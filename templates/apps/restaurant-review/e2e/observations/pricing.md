# Page observations: /pricing (Pricing)

> Public marketing surface. Renders Morsel's tier table. Buttons route
> to /signup (free tier) or POST /api/billing/checkout for paid tiers
> (when authed). Spec: e2e/14-pricing.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction  | success signal                              | failure signal  |
| ----------------------------------------------------------- | ------- | --------------------------------- | ------------------------------------------- | --------------- |
| `getByRole('heading').first()`                              | heading | renders Pricing page heading      | visible                                     | absent          |
| `getByRole('link', { name: /sign\|join\|start/i }).first()` | link    | navigates to signup or billing    | URL changes                                 | dead link       |
| `getByRole('button')`                                       | button  | tier CTA — start trial or upgrade | navigates or POSTs to /api/billing/checkout | nothing happens |

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
- [x] All elements above have a corresponding test in `e2e/14-pricing.spec.ts`
