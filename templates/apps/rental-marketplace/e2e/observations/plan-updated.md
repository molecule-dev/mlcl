# Page observations: /plan-updated (Plan Updated)

Confirmation page after a successful Stripe Checkout — the destination
of `success_url`. Renders a "Welcome to {plan}" message and a single
"Return home" CTA. The actual plan flip is performed by the
billing-webhook → entitlements pipeline, NOT by this page (it's a
display-only landing). The route is auth-protected so the user is
already known.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                               | role        | expected behavior on interaction        | success signal                                     | failure signal         |
| ------------------------------------------------------------------------ | ----------- | --------------------------------------- | -------------------------------------------------- | ---------------------- |
| Heading "Plan updated" message                                           | heading     | rendered when route is reached          | heading visible (text from `planUpdated.message`)  | missing                |
| Heading "Thank you" message                                              | heading     | second heading just below               | heading visible (text from `planUpdated.thankYou`) | missing                |
| `<Spinner />` while auth initializes                                     | progressbar | shown until `state.initialized` is true | spinner present, then disappears                   | spinner sticks forever |
| `getByRole('link', { name: /home/i })` wrapping the "Return home" Button | link        | navigate back to /                      | URL becomes / on click                             | no navigation          |
| `getByRole('button', { name: /return home/i })` (inside the link)        | button      | clickable target inside link            | renders + clickable                                | not clickable          |

## Hidden surfaces opened from this page

(none — single confirmation card)

## Network calls expected during normal use

| trigger                     | method | path | what request body or query is expected                                                                                                                                              |
| --------------------------- | ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none — informational page) | —      | —    | The auth-guard hydrates from localStorage on mount; no fresh API call is issued. The actual plan flip is performed by the Stripe webhook → entitlements pipeline, NOT by this page. |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
