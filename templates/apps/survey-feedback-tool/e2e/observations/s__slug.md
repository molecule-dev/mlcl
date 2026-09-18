# Page observations: /s/:slug (PublicSurvey)

## Page state assumed

- [x] Public (no auth required); slug must be `published` for the form to render

## Elements

| selector / accessible name                                                               | role    | expected behavior on interaction                            | success signal                             | failure signal                        |
| ---------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Question heading `[data-testid="public-survey-question"]`                                | heading | renders current question text                               | text matches `question.text`               | empty / "Survey unavailable" panel    |
| Progress indicator `[data-testid="public-survey-progress"]` "Question N of M"            | text    | updates as user advances                                    | text changes step                          | static                                |
| `getByRole('radio')` for single_choice / multi_choice options                            | radio   | sets that option as the answer                              | option's `aria-checked=true`               | nothing                               |
| `input[type="text"][data-testid="short-text-answer"]`                                    | textbox | accepts free text                                           | typed value reflected                      | nothing                               |
| `textarea[data-testid="long-text-answer"]`                                               | textbox | accepts long-form text                                      | typed value reflected                      | nothing                               |
| `input[type="number"]` (number question)                                                 | textbox | accepts numeric input                                       | typed value reflected                      | non-numeric rejected by browser       |
| NPS score buttons (`role="radio"` with text "0".."10")                                   | radio   | sets numeric score answer                                   | button gets `aria-checked=true`            | nothing                               |
| `getByRole('button', { name: 'Back' })`                                                  | button  | step back to previous question                              | step decrements; first step shows disabled | disabled on first                     |
| `getByRole('button', { name: 'Next' })`                                                  | button  | step forward; blocks on missing required                    | step index increments                      | disabled when required answer missing |
| `getByRole('button', { name: 'Submit' })` (last step, `[data-testid="submit-response"]`) | button  | POST /api/responses; on 201 navigates to /s/:slug/thank-you | URL becomes /s/:slug/thank-you             | inline error visible                  |
| Survey-unavailable panel (when slug 404 or closed)                                       | text    | renders "Survey not found" / "no longer available" copy     | text visible                               | nothing                               |
| `getByRole('link', { name: 'Learn more' })`                                              | link    | navigates to landing /                                      | URL is /                                   | nothing                               |

## Hidden surfaces opened from this page

| trigger        | what it opens                            | elements inside (selector / role / behavior) |
| -------------- | ---------------------------------------- | -------------------------------------------- |
| Submit success | client navigates to `/s/:slug/thank-you` | thank-you heading + return-home links        |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| Page load | GET    | /api/surveys/by-slug/:slug | (no body)                              |
| Submit    | POST   | /api/responses             | { survey_id, answers, status, score? } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/s__slug.spec.ts`
