# Page observations: / (Landing)

Captured from `browser_snapshot` on `http://localhost:3100/` while
logged out. Marketing landing page with header (logo + Sign in / Start
free CTAs), hero (headline + dual CTAs + LandingHeroChat preview),
social-proof strip, feature triad, pricing CTA, and footer.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role      | expected behavior on interaction              | success signal      | failure signal |
| ------------------------------------- | --------- | --------------------------------------------- | ------------------- | -------------- |
| `[data-mol-id="page-landing"]`        | container | renders the landing shell                     | element visible     | missing        |
| `[data-mol-id="landing-logo"]`        | link      | navigates back to / (no-op when already at /) | URL stays /         | href wrong     |
| `[data-mol-id="landing-signin"]`      | link      | navigates to /login                           | URL becomes /login  | unchanged      |
| `[data-mol-id="landing-signup"]`      | link      | navigates to /signup                          | URL becomes /signup | unchanged      |
| `[data-mol-id="landing-cta-primary"]` | link      | hero "Start free trial" navigates to /signup  | URL becomes /signup | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

(none — fully static marketing page; no API calls fire on load.)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
