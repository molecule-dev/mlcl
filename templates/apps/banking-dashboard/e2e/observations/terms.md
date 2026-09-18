# Page observations: /terms (Terms)

Source: live walk via Playwright + e2e/terms.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                           | success signal   | failure signal               |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------------------- | ---------------- | ---------------------------- |
| `getByRole('heading', { name: /terms/i, level: 1 })`               | heading | page renders the Terms headline                            | visible          | wrong / missing              |
| Body sections (account use / payments / liability / governing law) | section | substantive ToS copy renders, no Lorem ipsum / placeholder | sections visible | placeholder text             |
| `getByRole('link', { name: /privacy                                | home    | sign in/i })` if present                                   | link             | sister-doc / home link works | URL changes | navigation broken |
| Footer / brand line                                                | text    | footer renders the site brand                              | visible          | missing                      |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside (selector / role / behavior) |
| --------------------- | ------------- | -------------------------------------------- |
| (none — fully static) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path | what request body or query is expected |
| --------------------- | ------ | ---- | -------------------------------------- |
| (none — fully static) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
