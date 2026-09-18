# Page observations: / (Landing)

Public marketing landing page. Renders Argent brand hero + feature
grid + footer CTAs. No backend traffic — entirely static.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                         | role | expected behavior on interaction            | success signal         | failure signal   |
| ------------------------------------------------------------------ | ---- | ------------------------------------------- | ---------------------- | ---------------- |
| `getByRole('link', { name: 'Pricing' }).first()`                   | link | navigate to `/pricing`                      | URL becomes `/pricing` | URL stays at `/` |
| `getByRole('link', { name: 'Sign in' }).first()`                   | link | navigate to `/login`                        | URL becomes `/login`   | URL stays at `/` |
| `getByRole('link', { name: 'Open an account' }).first()`           | link | navigate to `/signup`                       | URL becomes `/signup`  | URL stays at `/` |
| `getByRole('link', { name: /Start free for 30 days/i }).first()`   | link | hero primary CTA, navigates to `/signup`    | URL becomes `/signup`  | URL stays at `/` |
| `getByRole('link', { name: 'See pricing' }).first()`               | link | hero secondary CTA, navigates to `/pricing` | URL becomes `/pricing` | URL stays at `/` |
| `getByRole('link', { name: /Open your Argent account/i }).first()` | link | bottom-of-page CTA, navigates to `/signup`  | URL becomes `/signup`  | URL stays at `/` |

## Hidden surfaces opened from this page

| trigger                                              | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — landing has no menus, modals, or accordions) | —             | —                                            |

## Network calls expected during normal use

| trigger                                     | method | path | what request body or query is expected |
| ------------------------------------------- | ------ | ---- | -------------------------------------- |
| (none — landing is a static marketing page) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
