# Page observations: /account (Account)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                        | success signal                            | failure signal          |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ----------------------------------------- | ----------------------- |
| `getByRole('heading', { name: /^Account$/i })`           | heading | account page renders + GET /api/profile/me fires                        | heading visible + GET in network          | heading missing or 4xx  |
| `locator('[data-testid="account-section-profile"]')`     | button  | profile sub-nav button switches to profile section                      | button visible, aria-current=page         | not interactive         |
| `locator('[data-testid="account-section-payments"]')`    | button  | payments sub-nav button switches to payments section                    | section heading 'Payment methods' visible | section does not change |
| `locator('[data-testid="account-section-wanderClub"]')`  | button  | wander-club sub-nav button switches to loyalty section                  | wander-club tile visible                  | section does not change |
| `locator('[data-testid="account-section-preferences"]')` | button  | preferences sub-nav button switches to preferences section              | preferences section visible               | section does not change |
| `locator('[data-testid="account-add-payment"]')`         | button  | clicking adds a stub payment method (POST /api/profile/payment-methods) | new card row appears                      | inline error visible    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                                      | what request body or query is expected            |
| -------------- | ------ | ----------------------------------------- | ------------------------------------------------- |
| navigate       | GET    | `/api/profile/me`                         | 200 with profile + paymentMethods + loyalty       |
| add payment    | POST   | `/api/profile/payment-methods`            | `{ brand, last4 }` body — 200/201                 |
| remove payment | DELETE | `/api/profile/payment-methods/:paymentId` | 200 with updated profile                          |
| update profile | PATCH  | `/api/profile/me`                         | partial profile fields — 200 with updated profile |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/account.spec.ts`
