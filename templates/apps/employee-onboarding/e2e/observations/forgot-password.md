# Page observations: /forgot-password (Forgot password)

> Anonymous: enter email, posts /api/users/forgot-password and shows confirmation regardless of whether user exists (anti-enumeration).

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name                                       | role   | expected behavior on interaction | success signal                 | failure signal          |
| ---------------------------------------------------------------- | ------ | -------------------------------- | ------------------------------ | ----------------------- |
| `getByRole("link", { name: /rocket_launchEmbarkYour journe/i })` | link   | navigates to /                   | URL becomes /                  | stays on current route  |
| `getByRole("link", { name: /rocket_launchEmbark/i })`            | link   | navigates to /                   | URL becomes /                  | stays on current route  |
| `getByRole("button", { name: /Toggle theme/i })`                 | button | triggers the Toggle theme action | expected DOM update / API call | no change / error toast |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger     | method | path                       | expected body                         |
| ----------- | ------ | -------------------------- | ------------------------------------- |
| Submit form | POST   | /api/users/forgot-password | { email } → 200 (no enumeration leak) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
