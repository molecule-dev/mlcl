# Page observations: /plan-updated (PlanUpdated)

> Authenticated post-checkout landing. Renders a "thank you" message
> and a single button back to the home (`/`).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role         | expected behavior on interaction              | success signal                                | failure signal                        |
| ------------------------------------------ | ------------ | --------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| `page.getByRole('heading').first()`        | heading      | renders localized "thank you" copy            | heading visible, no raw `{{key}}`             | shows raw i18n key                    |
| `getByRole('link').filter({ hasText: /home | return/i })` | link                                          | wraps a button → navigates to /               | url `/` after click                   | navigation no-op |
| `getByRole('button')`                      | button       | inner Return-Home button is visible           | button present                                | only the link, no button              |
| body innerText                             | text         | no raw `{{i18nKey}}` placeholders rendered    | regex `/\{\{[a-zA-Z]/` does not match         | raw `{{key}}` token visible to user   |
| static landing                             | n/a          | no `/api/*` XHR fires (pure thank-you screen) | captureNetwork shows zero non-health api hits | unexpected backend call leaks through |

## Network calls expected during normal use

| trigger        | method | path | what request body or query is expected                                               |
| -------------- | ------ | ---- | ------------------------------------------------------------------------------------ |
| static landing | n/a    | n/a  | The page is a pure thank-you landing — no XHR fires (verified via Playwright probe). |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
