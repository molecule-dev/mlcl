# Page observations: /terms (terms)

Public terms-of-service page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role       | expected behavior on interaction | success signal  | failure signal  |
| -------------------------- | ---------- | -------------------------------- | --------------- | --------------- |
| page heading 'Terms'       | heading    | terms heading rendered           | heading visible | missing heading |
| legal body content         | text       | terms paragraphs rendered        | main non-empty  | empty main      |
| global navigation          | navigation | header nav links visible         | nav present     | no nav          |

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
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
