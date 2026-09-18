# Page observations: /help (Help)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/help.
> Headings observed: 1: How Rendition works, 2: Start translating in 5 minutes, 2: Lock terminology with a glossary, 2: Invite reviewers, 2: Billing and word usage.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role | expected behavior on interaction | success signal            | failure signal |
| --------------------------------------- | ---- | -------------------------------- | ------------------------- | -------------- |
| `[data-mol-id="help-link-new-project"]` | a    | navigates to /projects/new       | URL becomes /projects/new | no change      |
| `[data-mol-id="help-link-glossary"]`    | a    | navigates to /glossary           | URL becomes /glossary     | no change      |
| `[data-mol-id="help-link-team"]`        | a    | navigates to /team               | URL becomes /team         | no change      |

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
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
