# Page observations: / (Landing)

> Public marketing page for anonymous visitors. Renders branded hero,
> sample categories, sample threads, ThemeToggle, and footer. The
> server-side data here is intentionally illustrative — the only
> real-data path is the auth links (Sign in / Join free).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal                               | failure signal                           |
| --------------------------------------------------- | ------- | -------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `getByRole('link', { name: /Sign in/i }).first()`   | link    | navigates to /login              | URL `/login`, login form visible             | stays on `/`, console error              |
| `getByRole('link', { name: /Join free/i }).first()` | link    | navigates to /signup             | URL `/signup`, signup form visible           | stays on `/`, console error              |
| `getByRole('link', { name: /Start a community/i })` | link    | hero primary CTA → /signup       | URL `/signup`                                | navigation no-op                         |
| `getByRole('link', { name: /See it in action/i })`  | link    | scrolls to #categories anchor    | window.scrollY > 0 OR URL hash `#categories` | URL unchanged with no scroll             |
| `getByRole('link', { name: /Browse the rooms/i })`  | link    | bottom CTA → /signup             | URL `/signup`                                | no navigation                            |
| `getByRole('button', { name: /(theme                | dark    | light)/i }).first()`             | button                                       | flips ThemeToggle aria-pressed           | `aria-pressed` toggles | aria-pressed unchanged |
| `page.getByText(/A focused space/i)`                | heading | renders the localized hero copy  | text visible                                 | hero shows raw `{{tagline}}` placeholder |

## Hidden surfaces opened from this page

(none — landing is a single scroll page)

## Network calls expected during normal use

| trigger        | method | path             | what request body or query is expected |
| -------------- | ------ | ---------------- | -------------------------------------- |
| initial render | GET    | `/` (HTML shell) | Vite returns 200 HTML                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
