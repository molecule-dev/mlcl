# Page observations: /quiz/:id/results (Results)

> Filled from a real Playwright walk. The page requires `?sessionId=…`
> in the URL — this is set by QuizPlay after the player answers the
> last question. Without a sessionId the page renders an error state
> with a single "Back to Discover" link.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] Has played a session for this quiz; `?sessionId=<uuid>` is in the URL

## Elements

| selector / accessible name                                                    | role   | expected behavior on interaction                             | success signal                                      | failure signal        |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ | --------------------------------------------------- | --------------------- |
| `getByRole('link').first()` (Sparq logo, top-left)                            | link   | navigate to /discover                                        | URL = /discover                                     | otherwise             |
| `getByRole('link', { name: /back to discover/i })` (header link)              | link   | navigate to /discover                                        | URL = /discover                                     | otherwise             |
| `[data-testid=results]` container                                             | region | rendered when sessionId+results loaded                       | element visible                                     | error message instead |
| ScoreBreakdownCard                                                            | text   | shows score, correct/total, rank                             | numeric score visible (≥0); "X / Y correct" visible | placeholder text      |
| `[data-testid=results-cta-replay]` (Try again card)                           | link   | navigate to /quiz/:id/play                                   | URL matches `/quiz/[uuid]/play`                     | otherwise             |
| `[data-testid=results-cta-leaderboard]` (See leaderboard card)                | link   | navigate to /leaderboard                                     | URL = /leaderboard                                  | otherwise             |
| `[data-testid=results-cta-travel_explore]` (Find another quiz card)           | link   | navigate to /discover                                        | URL = /discover                                     | otherwise             |
| `[data-testid=results-recap]` row(s)                                          | region | one row per question with check/cross + your answer + points | one row per question played                         | empty/missing         |
| Empty-state `getByRole('link', { name: /back to discover/i })` (no sessionId) | link   | navigate to /discover                                        | URL = /discover                                     | otherwise             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior)             |
| ------- | ------------- | -------------------------------------------------------- |
| (none)  | n/a           | This page has no menus, modals, accordions, or popovers. |

## Network calls expected during normal use

| trigger                  | method | path                             | what request body or query is expected                                                    |
| ------------------------ | ------ | -------------------------------- | ----------------------------------------------------------------------------------------- |
| page load with sessionId | GET    | /api/sessions/:sessionId/results | 200 returns {quiz, participantsTotal, rank, score, totalCorrect, totalQuestions, recap[]} |

## Coverage check (final pass)

- [x] navigated, snapshot, list, re-navigate, re-list — no new elements
- [x] One full re-pass added nothing new
- [x] Empty/error state observed (no sessionId in URL → "Back to Discover" only)
- [x] Populated state observed (real session played, recap renders one row per question)
- [x] All "next steps" CTA links observed
- [x] All elements above have a corresponding test in `e2e/quiz__id_results.spec.ts`
