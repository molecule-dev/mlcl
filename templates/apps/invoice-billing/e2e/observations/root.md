# Page observations: / (Landing)

> Public marketing page. Verified against the live smoke app on 3140
> via Playwright walker. Demonstrates the product (Remit), funnels users
> into /signup or /login, and exposes the legal/language modals from the
> shared `AppFooter` component.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                        | role   | expected behavior on interaction                                        | success signal                                                        | failure signal          |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| `getByRole('link', { name: /^Start free$/ })` (header)            | link   | navigates to /signup                                                    | URL ends `/signup`, signup form visible                               | stays on /              |
| `getByRole('link', { name: /^Sign in$/ })` (header)               | link   | navigates to /login                                                     | URL ends `/login`, sign-in form visible                               | stays on /              |
| `getByRole('link', { name: /Create my Remit account/ })` (CTA)    | link   | navigates to /signup                                                    | URL ends `/signup`                                                    | stays on /              |
| `getByRole('button', { name: /Send your first invoice/ })` (hero) | button | scrolls to or routes towards signup                                     | URL changes, or `#features` anchor scrolls into view                  | nothing happens         |
| `getByRole('button', { name: /Toggle theme/ })` (header)          | button | flips `<html data-theme>` between light↔dark and persists across reload | `documentElement.dataset.theme` flips, persists after `page.reload()` | dataset.theme unchanged |
| `getByRole('button', { name: /^Privacy Policy$/ })` (footer)      | button | opens privacy modal with non-empty content                              | dialog visible with role=dialog                                       | no dialog opens         |
| `getByRole('button', { name: /^Terms of Service$/ })` (footer)    | button | opens terms modal with non-empty content                                | dialog visible                                                        | no dialog opens         |
| `getByRole('button', { name: /^Language$/ })` (footer)            | button | opens language picker dialog with locale options                        | dialog with locale buttons visible                                    | no dialog               |

## Hidden surfaces opened from this page

| trigger                        | what it opens                      | elements inside (selector / role / behavior)     |
| ------------------------------ | ---------------------------------- | ------------------------------------------------ |
| Privacy Policy footer button   | `<Modal title="Privacy Policy">`   | locale-aware HTML body (non-empty), close button |
| Terms of Service footer button | `<Modal title="Terms of Service">` | locale-aware HTML body, close button             |
| Language footer button         | `<Modal title="Language">`         | grid of locale buttons; click changes app locale |

## Network calls expected during normal use

| trigger       | method | path | what request body or query is expected     |
| ------------- | ------ | ---- | ------------------------------------------ |
| initial mount | (none) | —    | Landing is fully static; no API calls fire |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
