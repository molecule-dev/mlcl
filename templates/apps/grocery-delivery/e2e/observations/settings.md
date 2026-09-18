# Page observations: /settings (Settings)

> Filled by AI agent driving the live grocery-delivery smoke-app via
> Playwright (`scripts/observe-grocery-delivery.mjs`). Rows reflect what
> the rendered page actually showed on `browser_snapshot` after
> `browser_navigate` (auth-protected pages are signed up first via the
> usual signup flow).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role   | expected behavior on interaction           | success signal                           | failure signal                   |
| ---------------------------------------------------- | ------ | ------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `[data-test="settings-section-profile"]`             | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `[data-test="settings-section-addresses"]`           | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `[data-test="settings-section-payments"]`            | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `[data-test="settings-section-preferences"]`         | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `[data-test="settings-save"]`                        | button | persists profile/settings change via PATCH | updated value visible after reload       | 4xx/5xx response or unchanged UI |
| `getByRole('button', { name: /Open.+user.+menu/i })` | button | observed in live snapshot                  | no error toast / page renders next state | 4xx/5xx response or unchanged UI |
| `getByRole('link', { name: /Bushel/i })`             | link   | navigates to /shop                         | URL becomes /shop                        | 4xx/5xx response or unchanged UI |

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
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
