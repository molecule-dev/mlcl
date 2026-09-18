# Page observations: / (Landing)

> Public marketing landing page for Tessera. Brand mark + hero +
> primary signup/templates CTAs + four feature cards + footer nav.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                                  | role      | expected behavior on interaction                                   | success signal                                           | failure signal            |
| ----------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------- |
| brand mark + hero h1 + nav link sets (`a[href="/"]`, `h1/h2`, `a[href="/templates"]`, `a[href="/pricing"]`) | composite | the landing's core scaffold — header brand, hero text, primary nav | brand + hero + Templates link + Pricing link all visible | any one missing           |
| `a[href="/login"]` (header) and `a[href="/signup"]` (header)                                                | links     | nav from header to /login / /signup                                | URLs become `/login` and `/signup` respectively          | broken links / stays on / |
| feature deck (`infinite canvas` / `multiplayer cursors` / `templates` / `history`)                          | text      | one of the four feature blurbs is rendered as body copy            | `getByText(/infinite canvas                              | multiplayer               | templates | history/i)` matches | feature deck missing |
| anonymous reachability                                                                                      | n/a       | a fresh, no-cookie browser sees the landing page                   | resp.status < 500 and URL ends with `/`                  | bounced or 5xx            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger           | method | path          | what request body or query is expected |
| ----------------- | ------ | ------------- | -------------------------------------- |
| initial page load | GET    | / (SPA shell) | 200 HTML, no API calls                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
