# Page observations: /help (help)

Public help / FAQ page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal   | failure signal |
| -------------------------- | ------- | -------------------------------- | ---------------- | -------------- |
| page heading 'Help'        | heading | help heading rendered            | heading visible  | no heading     |
| help body content          | text    | help guides rendered             | main has content | main empty     |
| top navigation back link   | link    | navigates to /                   | link exists      | no nav         |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

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
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
