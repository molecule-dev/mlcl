# Page observations: /signup (Signup)

> Public account-creation form: first name, last name, email, password,
> confirm-password. On 2xx, lands on `/boards` and persists the access
> token to localStorage at `molecule:auth:accessToken`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                         | role      | expected behavior on interaction                                                                                          | success signal                                                                     | failure signal                   |
| ---------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| five-field form (`given-name`, `family-name`, `email`, `new-password` ×2) + submit | form      | POST /api/users (create) → on 2xx land on /boards with token persisted in `molecule:auth:accessToken` and survive reload  | URL `/boards` + token persists across reload                                       | stays on /signup; token missing  |
| mismatched-confirm validation                                                      | composite | filling the two `new-password` fields with different values disables the submit button and shows "passwords do not match" | submit disabled + warning text visible                                             | submit enabled or warning hidden |
| post-signup token round-trip via /api/users/me                                     | network   | the persisted token authenticates GET /api/users/me to return the new user record                                         | response email matches signup email                                                | 401 / wrong user                 |
| five-field form rendering                                                          | composite | the page renders all five fields and a submit button on first paint (no auth)                                             | given-name, family-name, email, two new-password fields, submit button all visible | any field missing                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger             | method | path          | what request body or query is expected                                        |
| ------------------- | ------ | ------------- | ----------------------------------------------------------------------------- |
| submit              | POST   | /api/users    | `{ email, password, firstName, lastName }`; 2xx returns `{ id, accessToken }` |
| post-signup hydrate | GET    | /api/users/me | Bearer token; 200 returns the new user                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
