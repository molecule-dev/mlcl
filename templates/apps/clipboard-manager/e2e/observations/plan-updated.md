# Page observations: /plan-updated (PlanUpdated)

Source: live walk via Playwright + e2e/plan-updated.spec.ts.
Stripe `successUrl` landing target. Static confirmation card with a
"Back to your clips" CTA that routes to /clips. Auth client must
finish initialising before the link is interactive.

## Page state assumed

- [x] Authenticated (Stripe redirects back here after a successful checkout)

## Elements

| selector / accessible name | role    | expected behavior on interaction           | success signal     | failure signal |
| -------------------------- | ------- | ------------------------------------------ | ------------------ | -------------- |
| Confirmation heading       | heading | renders "Plan updated" success copy        | visible            | missing        |
| Thank-you body paragraph   | text    | "Thanks for upgrading…" / "Thank you" copy | visible            | missing        |
| CTA link back to /clips    | link    | navigates back into the app                | URL becomes /clips | URL unchanged  |

## Hidden surfaces opened from this page

| trigger                             | what it opens | elements inside (selector / role / behavior) |
| ----------------------------------- | ------------- | -------------------------------------------- |
| (none — pure confirmation card)     | —             | —                                            |
| (no modals, no expandable sections) | —             | —                                            |

## Network calls expected during normal use

(no app-level fetch — Stripe redirected here after a successful checkout)

## Coverage check (final pass)

- [x] Confirmation heading + body observed
- [x] Back-to-clips CTA verified
- [x] Auth-init transition observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
