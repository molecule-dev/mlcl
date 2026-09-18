# Page observations: /forgot-password (Public reset request)

Captured via `node scripts/observe-page.mjs ai-study-buddy /forgot-password`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role      | expected behavior on interaction                  | success signal                          | failure signal     |
| ----------------------------------- | --------- | ------------------------------------------------- | --------------------------------------- | ------------------ |
| `[data-mol-id="forgot-email"]`      | textbox   | required email input — focus on mount             | input is focusable, accepts text        | input missing      |
| `[data-mol-id="forgot-submit"]`     | button    | POSTs `/api/users/forgot-password` with the email | `forgot-sent` confirmation pane appears | inline error text  |
| `[data-mol-id="forgot-error"]`      | alert     | inline error region for failed network calls      | role="alert" appears with error text    | hidden until error |
| `[data-mol-id="forgot-sent"]`       | container | post-submit confirmation pane                     | visible after 200 response              | never appears      |
| `[data-mol-id="forgot-back-link"]`  | link      | back to landing page (visible inside sent pane)   | navigation to `/`                       | stays              |
| `[data-mol-id="forgot-login-link"]` | link      | back to `/login`                                  | URL becomes `/login`                    | stays              |

## Hidden surfaces opened from this page

| trigger            | what it opens                     | elements inside (selector / role / behavior) |
| ------------------ | --------------------------------- | -------------------------------------------- |
| Submit forgot form | confirmation pane (`forgot-sent`) | "Check your email" copy + back link          |

## Network calls expected during normal use

| trigger     | method | path                         | what request body or query is expected |
| ----------- | ------ | ---------------------------- | -------------------------------------- |
| Submit form | POST   | `/api/users/forgot-password` | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-forgot-password.spec.ts`
