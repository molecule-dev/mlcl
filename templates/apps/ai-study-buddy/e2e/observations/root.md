# Page observations: / (Marketing landing)

Captured via `node scripts/observe-page.mjs ai-study-buddy /`.
Public marketing landing page with hero, feature cards, and footer.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role                | expected behavior on interaction     | success signal                  | failure signal |
| ------------------------------------------------------ | ------------------- | ------------------------------------ | ------------------------------- | -------------- |
| `getByRole('heading', { level: 1 })`                   | heading h1          | renders the marketing tagline        | visible                         | missing        |
| `getByRole('link', { name: /sign in/i })`              | link → `/login`     | navigates to login                   | URL is `/login`                 | stays on `/`   |
| `getByRole('link', { name: /start learning free/i })`  | link → `/signup`    | header CTA goes to signup            | URL is `/signup`                | stays on `/`   |
| `getByRole('link', { name: 'Start free' })`            | link → `/signup`    | hero primary CTA                     | URL is `/signup`                | stays on `/`   |
| `getByRole('link', { name: /watch demo/i })`           | link → `/dashboard` | hero secondary CTA — preview the app | URL is `/dashboard` (auth gate) | stays on `/`   |
| `getByRole('heading', { name: /ai tutor/i })`          | heading h3          | feature card title                   | visible                         | missing        |
| `getByRole('heading', { name: /smart flashcards/i })`  | heading h3          | feature card title                   | visible                         | missing        |
| `getByRole('heading', { name: /practice quizzes/i })`  | heading h3          | feature card title                   | visible                         | missing        |
| `getByRole('heading', { name: /progress tracking/i })` | heading h3          | feature card title                   | visible                         | missing        |
| `footer >> getByRole('link', { name: /pricing/i })`    | link → `/pricing`   | footer link                          | URL is `/pricing`               | broken         |
| `footer >> getByRole('link', { name: /privacy/i })`    | link → `/privacy`   | footer link                          | URL is `/privacy`               | broken         |
| `footer >> getByRole('link', { name: /terms/i })`      | link → `/terms`     | footer link                          | URL is `/terms`                 | broken         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                          | method | path | what request body or query is expected |
| -------------------------------- | ------ | ---- | -------------------------------------- |
| (none) — purely marketing markup |        |      |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-root.spec.ts`
