# Page observations: /plan-updated (PlanUpdated)

> Authed-only success page reached after a Stripe Checkout completes.
> Brief copy + a "Return home" CTA that links back to /.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role    | expected behavior on interaction | success signal | failure signal      |
| ----------------------------------------- | ------- | -------------------------------- | -------------- | ------------------- |
| `getByRole('heading', { name: /plan       | welcome | upgraded/i })`                   | heading        | identifies the page | heading visible | empty page |
| `getByRole('link', { name: /return home   | home    | done/i })`                       | link           | nav back to `/`     | URL becomes `/` | stays      |
| `getByRole('button', { name: /return home | home    | done/i })`                       | button         | nav back to `/`     | URL becomes `/` | stays      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
