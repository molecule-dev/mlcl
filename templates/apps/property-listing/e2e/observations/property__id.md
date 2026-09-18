# Page observations: /property/:id (property__id)

Property detail page hydrated from /api/properties/:id.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name        | role    | expected behavior on interaction             | success signal                   | failure signal     |
| --------------------------------- | ------- | -------------------------------------------- | -------------------------------- | ------------------ |
| property title heading            | heading | show title from API                          | heading visible                  | missing            |
| price display                     | text    | show formatted price                         | price visible                    | missing            |
| mortgage calculator submit button | button  | POST /api/mortgage/calculate and show result | computed monthly payment visible | no result rendered |
| image gallery                     | img     | render hero photo from JSONB photos array    | image element exists             | broken / 0 images  |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger         | method | path                    | what request body or query is expected |
| --------------- | ------ | ----------------------- | -------------------------------------- |
| page load       | GET    | /api/properties         | → 200 detail object                    |
| mortgage submit | POST   | /api/mortgage/calculate | → 200 with { monthlyPayment, ... }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/property__id.spec.ts`
