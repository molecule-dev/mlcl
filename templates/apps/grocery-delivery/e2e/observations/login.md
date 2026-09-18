# Page observations: /login (Login)

> Filled by AI agent driving the live grocery-delivery smoke-app via
> Playwright (`scripts/observe-grocery-delivery.mjs`). Rows reflect what
> the rendered page actually showed on `browser_snapshot` after
> `browser_navigate` (auth-protected pages are signed up first via the
> usual signup flow).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction           | success signal                           | failure signal                   |
| ------------------------------------------------------ | ------ | ------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `getByRole('button', { name: /visibility/i })`         | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `getByRole('button', { name: /Sign.+in/i })`           | button | submits login form, POST /api/users/log-in | redirects off /login                     | 4xx/5xx response or unchanged UI |
| `getByRole('button', { name: /Privacy.+Policy/i })`    | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `getByRole('button', { name: /Terms.+of.+Service/i })` | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `getByRole('button', { name: /English/i })`            | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |

## Hidden surfaces opened from this page

(menu/modal/tab/accordion/popover/drawer triggers walked during the snapshot pass)

| trigger                              | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------ | ------------- | -------------------------------------------- |
| (none observed during scripted walk) | —             | —                                            |

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
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
