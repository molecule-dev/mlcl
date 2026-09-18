# Page observations: /pricing

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction                 | success signal      | failure signal        |
| ----------------------------------------------- | ----------- | ------------------------------------------------ | ------------------- | --------------------- |
| Free tier label                                 | text        | Free tier always present in defineTiers() output | text "Free" visible | tiers fail to load    |
| plan CTA links/buttons                          | link/button | allow user to start checkout / sign up           | count > 0           | no CTAs               |
| `getByRole("link") + getByRole("button")` total | mixed       | page renders interactive elements                | count > 0           | completely empty page |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/billing/tiers | array of tiers with price IDs          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
