# Page observations: /pricing (Pricing)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/pricing.html`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role   | expected behavior on interaction                                                           | success signal                                              | failure signal              |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------- |
| `[data-mol-id="pricing-tier-free"]` | region | renders the Free tier card                                                                 | element visible with `Free`-labelled name + bullets         | absent                      |
| `[data-mol-id="pricing-tier-pro"]`  | region | renders the Pro tier card                                                                  | element visible with `Pro`-labelled name + price + bullets  | absent                      |
| `[data-mol-id="pricing-tier-team"]` | region | renders the Team tier card                                                                 | element visible with `Team`-labelled name + price + bullets | absent                      |
| `[data-mol-id="pricing-cta-pro"]`   | button | Pro CTA renders an enabled "Upgrade to Pro" button that triggers the billing flow on click | element visible + enabled (not `disabled`)                  | missing or stuck `disabled` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

<!-- Public marketing page; no API calls. -->

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
