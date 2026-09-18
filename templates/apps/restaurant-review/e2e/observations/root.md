# Page observations: / (Landing)

> Public marketing surface. On mount renders editorial hero + cuisine
> rail + GET /api/restaurants?limit=3 (preview rail) + GET /api/reviews
> (featured tasting notes). Spec: e2e/01-root.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction                                   | success signal          | failure signal |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | ----------------------- | -------------- |
| `getByRole('heading', { name: /Every bite tells a story/i })` | heading | renders editorial hero                                             | visible                 | absent         |
| `getByRole('heading', { name: /Tables worth a detour/i })`    | heading | renders preview-rail section                                       | visible                 | absent         |
| `[data-testid="landing-preview-restaurants"]`                 | grid    | renders 3 RestaurantListingCard children fed from /api/restaurants | grid contains ≥1 link   | empty grid     |
| `[data-testid="landing-featured-reviews"]`                    | grid    | renders ReviewExcerptCard children fed from /api/reviews           | review excerpts visible | empty grid     |
| `getByRole('link', { name: /Join Morsel\|Sign in/i })`        | link    | nav-bar entry points to /signup and /login                         | URLs route correctly    | dead links     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path             | expected body           |
| --------- | ------ | ---------------- | ----------------------- |
| Page load | GET    | /api/restaurants | array of restaurants    |
| Page load | GET    | /api/reviews     | array of recent reviews |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
