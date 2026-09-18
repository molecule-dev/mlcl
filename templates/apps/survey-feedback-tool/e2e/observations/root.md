# Page observations: / (Landing)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role                      | expected behavior on interaction | success signal             | failure signal  |
| ------------------------------------------------------------ | ------------------------- | -------------------------------- | -------------------------- | --------------- |
| `getByRole('link', { name: 'Murmur' })` (logo, top-left)     | link                      | navigates to /                   | URL is /                   | nothing happens |
| `getByRole('link', { name: 'Sign in' })` (header)            | link                      | navigates to /login              | URL becomes /login         | nothing happens |
| `getByRole('link', { name: 'Start free trial' })` (header)   | link                      | navigates to /signup             | URL becomes /signup        | nothing happens |
| `a[href="#product"]` ("Product")                             | link                      | scrolls to #product section      | viewport scrolls           | nothing happens |
| `a[href="#templates"]` ("Templates")                         | link                      | scrolls to #templates section    | viewport scrolls           | nothing happens |
| `a[href="#pricing"]` ("Pricing")                             | link                      | scrolls to #pricing section      | viewport scrolls           | nothing happens |
| `getByRole('link', { name: 'Start free trial' })` (hero CTA) | link                      | navigates to /signup             | URL becomes /signup        | nothing happens |
| `a[href="#templates"]` ("Browse templates")                  | link                      | scrolls to #templates section    | viewport scrolls           | nothing happens |
| `getByRole('link', { name: 'Sign in' })` (footer)            | link                      | navigates to /login              | URL becomes /login         | nothing happens |
| `getByRole('link', { name: 'Start trial' })` (footer)        | link                      | navigates to /signup             | URL becomes /signup        | nothing happens |
| Hero badge / NPS preview cards                               | static text/visualization | render NPS distribution sample   | bars + KPI numbers visible | empty render    |

## Hidden surfaces opened from this page

| trigger                                        | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------------- | ------------- | -------------------------------------------- |
| (none — public landing has no menus or modals) | —             | —                                            |

## Network calls expected during normal use

(none — landing is a static marketing page that makes no API calls.)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
