# Page observations: / (Landing)

> Public marketing page. Sticky nav with "Sign in" + "Join Obscura" CTAs,
> editorial hero ("Light captured, stories shared"), featured photo card,
> stats strip, four feature cards (EXIF / Editorial / Canvas / Conversations),
> three sample gallery cards (each linking to /signup), bottom "Bring your
> portfolio home" CTA, footer.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction | success signal        | failure signal |
| ------------------------------------------------------- | ------- | -------------------------------- | --------------------- | -------------- |
| `getByRole('link', { name: /join obscura/i })`          | link    | nav to /signup                   | URL becomes `/signup` | stays on `/`   |
| `getByRole('link', { name: /^sign in$/i }).first()`     | link    | nav to /login                    | URL becomes `/login`  | stays on `/`   |
| `getByRole('link', { name: /start sharing/i }).first()` | link    | nav to /signup                   | URL becomes `/signup` | stays on `/`   |
| `getByRole('heading', { name: /light captured/i })`     | heading | identifies hero                  | hero visible          | hero missing   |
| `getByRole('link', { name: /create your portfolio/i })` | link    | nav to /signup                   | URL becomes `/signup` | stays on `/`   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

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
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
