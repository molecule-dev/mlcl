# Page observations: /privacy (Privacy)

Source: live walk via Playwright + e2e/privacy.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                           | role    | expected behavior on interaction                               | success signal                               | failure signal                                     |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `getByRole('heading', { name: /privacy/i, level: 1 })`               | heading | page renders the Privacy headline                              | visible                                      | wrong / missing                                    |
| Body sections (data we collect / how we use it / security / contact) | section | static policy copy renders without Lorem ipsum or stub strings | sections visible with substantive paragraphs | placeholder text                                   |
| `getByRole('link', { name: /home                                     | sign in | terms/i })` if present                                         | link                                         | back-to-home / sister-doc link navigates correctly | URL changes appropriately | navigation broken |
| Footer / brand line                                                  | text    | footer renders the site brand                                  | visible                                      | missing                                            |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
