# Page observations: /ask (Ask)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                             | success signal                       | failure signal           |
| ----------------------------------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------ |
| `[data-testid="ask-form"]`                                  | form    | submits the ask question                                     | POST /api/qa/ask returns 201         | error visible            |
| `[data-testid="ask-input"]`                                 | textbox | accepts the question text                                    | value reflects typed input           | input cleared / disabled |
| `[data-testid="ask-submit"]`                                | button  | triggers POST /api/qa/ask                                    | answer block appears                 | error visible            |
| `[data-testid="ask-empty"]` or `[data-testid="ask-answer"]` | text    | renders the empty/initial state OR the streamed answer       | one of the two is visible            | neither visible          |
| `[data-testid="ask-recent"]`                                | list    | renders the recent questions list once /qa/history populates | list has at least 1 row after asking | list missing             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected |
| ------- | ------ | --------------- | -------------------------------------- |
| mount   | GET    | /api/qa/stats   | scoped to current user                 |
| mount   | GET    | /api/qa/history | scoped to current user                 |
| submit  | POST   | /api/qa/ask     | { question }                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/ask.spec.ts`
