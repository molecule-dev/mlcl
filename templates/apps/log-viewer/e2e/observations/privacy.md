# Page observations: /privacy (Privacy)

> Static legal page rendered without auth.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name           | role    | expected behavior on interaction   | success signal    | failure signal |
| ------------------------------------ | ------- | ---------------------------------- | ----------------- | -------------- |
| `getByRole('heading', { level: 1 })` | heading | renders the privacy policy heading | visible text      | empty          |
| `page.getByRole('link').first()`     | link    | back/home link                     | navigation occurs | nothing        |
| `page.locator('main, section')`      | region  | renders body copy                  | non-empty         | empty          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-privacy.spec.ts`
