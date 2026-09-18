# Page observations: / (Landing)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name   | role    | expected behavior on interaction | success signal      | failure signal |
| ---------------------------- | ------- | -------------------------------- | ------------------- | -------------- |
| `getByRole('heading')` first | heading | hero rendered                    | rendered            | missing        |
| sign up CTA                  | link    | routes to /signup                | URL becomes /signup | no nav         |
| sign in / login link         | link    | routes to /login                 | URL becomes /login  | no nav         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected  |
| ------- | ------ | ------------------ | --------------------------------------- |
| mount   | GET    | /api/billing/tiers | tier card pricing on the public landing |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
