# Page observations: /s/:slug/thank-you (PublicSurveyThankYou)

## Page state assumed

- [x] Public (no auth required); reached after submitting a response

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction    | success signal       | failure signal |
| --------------------------------------------------------------------- | ------- | ----------------------------------- | -------------------- | -------------- |
| `getByRole('heading', { level: 1 })` ("Thanks — your voice matters.") | heading | renders confirmation copy           | visible              | missing        |
| Eyebrow "Response received"                                           | text    | confirms server received submission | visible              | missing        |
| `getByRole('link', { name: /take another response/i })`               | link    | navigates back to /s/:slug          | URL becomes /s/:slug | nothing        |
| `getByRole('link', { name: /visit murmur/i })`                        | link    | navigates to landing /              | URL is /             | nothing        |

## Hidden surfaces opened from this page

| trigger                             | what it opens | elements inside (selector / role / behavior) |
| ----------------------------------- | ------------- | -------------------------------------------- |
| (none — terminal confirmation page) | —             | —                                            |

## Network calls expected during normal use

(none — thank-you is a terminal confirmation page with no API calls.)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/s__slug_thank-you.spec.ts`
