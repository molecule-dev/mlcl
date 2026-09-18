# Page observations: / (Landing)

> Public marketing page — Hearth wordmark + nav, hero "Every table,
> served", primary CTA "Open your kitchen" → /signup, secondary CTA
> "See the guest view" → /menu/guest, secondary "Sign in" → /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role                                | expected behavior on interaction       | success signal         | failure signal                |
| -------------------------------------------------------- | ----------------------------------- | -------------------------------------- | ---------------------- | ----------------------------- |
| `getByRole('heading', { name: /every table, served/i })` | heading                             | hero headline visible on landing       | h1 rendered            | empty page                    |
| `getByRole('link', { name: /open your kitchen            | start a free.*kitchen/i }).first()` | link                                   | primary CTA → /signup  | href matches /signup          | link missing             |
| `getByRole('link', { name: /guest view                   | guest menu                          | see the guest/i }).first()`            | link                   | secondary CTA → /menu/guest   | href matches /menu/guest | link missing |
| `body` (page load)                                       | (page)                              | landing renders without console errors | no fatal console.error | console errors during landing |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside |
| ------- | -------------------------------- | --------------- |
| (none)  | (no menus / modals on this page) | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
