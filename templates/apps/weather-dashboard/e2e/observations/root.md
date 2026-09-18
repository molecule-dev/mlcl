# Page observations: / (Landing — Nimbus marketing page)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                            | success signal            | failure signal |
| ------------------------------------------------------ | ------- | ----------------------------------------------------------- | ------------------------- | -------------- |
| `getByRole('heading', { level: 1 })`                   | heading | render the marketing hero ("See what's coming")             | visible                   | absent         |
| `getByRole('link', { name: /start tracking/i })` (CTA) | link    | navigate to /signup                                         | href ends in /signup      | wrong href     |
| `getByRole('link', { name: /sign in/i })` (header)     | link    | navigate to /login                                          | href ends in /login       | wrong href     |
| `main` (sample weather hero card)                      | section | render a Brooklyn, NY teaser with temperature + condition   | "Brooklyn" + temp visible | absent         |
| `main` (feature grid)                                  | section | render the 4 feature blurbs (forecasts/radar/alerts/trends) | all 4 headings visible    | absent         |
| `link` (footer brand link)                             | link    | navigate to /                                               | URL becomes /             | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | landing page is flat — anchors only          |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected     |
| ------- | ------ | ---- | ------------------------------------------ |
| (none)  | —      | —    | landing is fully static — no backend calls |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
