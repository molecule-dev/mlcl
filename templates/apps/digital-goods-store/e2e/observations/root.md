# Page observations: / (Landing)

> Captured from rendered page after navigating to /.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role                  | expected behavior on interaction | success signal        | failure signal     |
| ----------------------------------------- | --------------------- | -------------------------------- | --------------------- | ------------------ |
| Hero "Sell digital goods…" headline       | heading               | renders the storefront pitch     | visible h1 text       | missing heading    |
| `getByRole('link', { name: /start selling | get started           | create your shop/i })`           | link                  | nav to /signup     | URL becomes /signup | no nav |
| `getByRole('link', { name: /shop          | browse                | storefront/i })`                 | link                  | nav to /shop       | URL becomes /shop   | no nav |
| `getByRole('link', { name: /sign in       | log in/i })` (header) | link                             | nav to /login         | URL becomes /login | no nav              |
| Featured product grid                     | region                | links to /shop/:slug             | hovering reveals card | empty grid         |

## Hidden surfaces opened from this page

| trigger                          | what it opens | elements inside |
| -------------------------------- | ------------- | --------------- |
| (none — landing has no popovers) | —             | —               |

## Network calls expected during normal use

| trigger                   | method | path          | expected body             |
| ------------------------- | ------ | ------------- | ------------------------- |
| Page load (featured grid) | GET    | /api/products | returns array of products |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
