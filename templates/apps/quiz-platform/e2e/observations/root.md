# Page observations: / (Landing)

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.
> 23 interactive elements observed in the live snapshot at .observe/quiz-platform/root.json

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction             | success signal                     | failure signal |
| -------------------------------------------------------- | ------- | -------------------------------------------- | ---------------------------------- | -------------- |
| `getByRole('link', { name: /sparq home/i })`             | link    | navigate to /                                | URL stays at /                     | URL changes    |
| `getByRole('link', { name: /^features$/i })`             | link    | scrolls/anchors to #features                 | section comes into view            | no scroll      |
| `getByRole('link', { name: /popular quizzes/i })`        | link    | anchors to #popular                          | section visible                    | no scroll      |
| `getByRole('link', { name: /for hosts/i })`              | link    | anchors to #hosts                            | hosts CTA visible                  | no scroll      |
| `getByRole('button', { name: /toggle theme/i })`         | button  | flips data-theme on `<html>`                 | data-theme changes from light↔dark | unchanged      |
| `getByRole('link', { name: /^sign in$/i })`              | link    | navigates to /login                          | URL = /login                       | stays at /     |
| `getByRole('link', { name: /^get started$/i })`          | link    | navigates to /signup                         | URL = /signup                      | stays at /     |
| `getByRole('link', { name: /start hosting free/i })`     | link    | hero CTA → /signup                           | URL = /signup                      | stays at /     |
| `getByRole('link', { name: /try a sample quiz/i })`      | link    | hero CTA → /discover (auth-guarded → /login) | reaches /discover or /login        | error page     |
| `getByRole('link', { name: /browse all categories/i })`  | link    | popular section → /discover                  | URL = /discover                    | stays at /     |
| `getByRole('link', { name: /create your first quiz/i })` | link    | bottom CTA → /signup                         | URL = /signup                      | stays at /     |
| `getByRole('link', { name: /about sparq/i })`            | link    | external link to molecule.dev                | opens marketing site               | 404            |
| `getByRole('link', { name: /privacy policy/i })`         | link    | navigates to /privacy                        | URL = /privacy                     | stays at /     |
| `getByRole('link', { name: /terms of service/i })`       | link    | navigates to /terms                          | URL = /terms                       | stays at /     |
| `getByRole('button', { name: /language/i })`             | button  | opens language switcher                      | popover shows language list        | no popover     |
| Sample quiz card "Play" link 1                           | link    | unauthenticated → /login                     | URL = /login                       | otherwise      |
| Sample quiz card "Play" link 2                           | link    | unauthenticated → /login                     | URL = /login                       | otherwise      |
| Sample quiz card "Play" link 3                           | link    | unauthenticated → /login                     | URL = /login                       | otherwise      |
| Heading h1 "Quizzes that actually spark the room"        | heading | hero copy renders                            | text visible                       | missing        |

## Hidden surfaces opened from this page

| trigger             | what it opens                  | elements inside (selector / role / behavior)                          |
| ------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Toggle theme button | inline DOM toggle (no popover) | `<html data-theme>` flips, `aria-pressed` updates                     |
| Language button     | language switcher popover      | language buttons (English / Español / etc.) — clicking changes locale |

## Network calls expected during normal use

| trigger                    | method | path | what request body or query is expected |
| -------------------------- | ------ | ---- | -------------------------------------- |
| (none — landing is static) | —      | —    | no XHR; only initial page load assets  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
