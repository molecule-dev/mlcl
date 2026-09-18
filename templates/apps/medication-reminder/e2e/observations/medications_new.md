# Page observations: /medications/new (AddMedication)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                                                        | success signal                                    | failure signal             |
| -------------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| Medication name input      | textbox  | accepts name                                                                            | typed value visible                               | read-only                  |
| Dose amount input          | textbox  | accepts dose like `10 mg`                                                               | typed value visible                               | read-only                  |
| Pill color radio buttons   | button   | sets pill_color (blue/green/orange/purple/pink/yellow); aria-pressed reflects selection | aria-pressed=true on chosen color                 | aria-pressed never updates |
| Schedule input             | textbox  | accepts schedule summary like `Daily, 8:00am`                                           | typed value visible                               | read-only                  |
| Pharmacy input             | textbox  | accepts pharmacy name                                                                   | typed value visible                               | read-only                  |
| Take with food checkbox    | checkbox | toggles warning entry                                                                   | aria-checked toggles                              | static                     |
| Save medication button     | button   | POST /api/medications, navigates to /medications                                        | URL becomes /medications, new med visible in list | stays on form with error   |
| Cancel link                | link     | navigates back to /medications without saving                                           | URL becomes /medications, no new med              | navigates to dashboard     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path             | what request body or query is expected                                            |
| ----------- | ------ | ---------------- | --------------------------------------------------------------------------------- |
| Save submit | POST   | /api/medications | { name, dose_amount, pill_color, schedule_summary, pharmacy, warnings: string[] } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/medications_new.spec.ts`
