# Page observations: /plan-updated (Plan updated)

> Post-Stripe-Checkout return page. Shows a thank-you/confirmation
> message and a return-home CTA. AuthGuarded — anon visits bounce to
> `/login` (or stay on a shell that does not silently render authed
> content).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role                              | expected behavior on interaction      | success signal                  | failure signal         |
| ------------------------------------------------- | --------------------------------- | ------------------------------------- | ------------------------------- | ---------------------- |
| `text=/thank                                      | updated/i` (success heading/body) | text                                  | confirms the plan-update result | visible after auth     | empty page or 404 |
| `a[href="/"]` (return-home CTA wrapping a button) | link                              | nav to `/` (or `/boards` once authed) | URL becomes `/` or `/boards`    | stays on /plan-updated |
| `a[href="/"] button` (CTA button itself)          | button                            | click triggers the parent link        | navigation fires                | no-op                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger            | method | path          | what request body or query is expected         |
| ------------------ | ------ | ------------- | ---------------------------------------------- |
| page load (authed) | GET    | /api/users/me | hydrates the auth-shell — 200 with user record |
| page load (anon)   | n/a    | n/a           | redirected to /login                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
