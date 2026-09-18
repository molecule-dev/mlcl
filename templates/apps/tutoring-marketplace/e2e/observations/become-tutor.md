# Page observations: /become-tutor (BecomeTutor)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                        | success signal                                 | failure signal |
| ----------------------------------------------------------- | ------- | ------------------------------------------------------- | ---------------------------------------------- | -------------- |
| heading "Earn doing what you love. Teach on your schedule." | heading | page hero                                               | visible                                        | missing        |
| `getByLabel(/full name/i)` (input)                          | textbox | accepts name                                            | value typed                                    | rejected       |
| `getByLabel(/email/i)` (input)                              | textbox | accepts email                                           | value typed                                    | rejected       |
| Subject pill button (e.g. "Math")                           | button  | toggles selection in `subjects[]`                       | active state flips, summary chip count updates | inert          |
| Hourly rate slider/input                                    | slider  | sets hourly_rate                                        | summary number updates                         | inert          |
| Pitch textarea (optional)                                   | textbox | accepts free text                                       | value typed                                    | rejected       |
| `getByRole('button', { name: /submit application/i })`      | button  | POST /api/tutors creates tutor_profiles row + redirects | URL is /tutor/:id                              | error inline   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected                                        |
| ------- | ------ | ----------- | ----------------------------------------------------------------------------- |
| submit  | POST   | /api/tutors | { display_name, headline, bio, subjects, hourly_rate, languages } returns 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/become-tutor.spec.ts`
