---
name: multi-step-wizard
intent: |
  - "A multi-step form / wizard"
  - "Onboarding flow"
  - "Sign-up wizard with steps"
  - "Apply / application flow with multiple pages"
  - "Stepped checkout"
keywords: [wizard, steps, onboarding, multi-step, flow, application, intake]
---

# Multi-step wizard

**When to copy this example:** the user wants any form that spans
multiple screens with a Next/Back stepper. Onboarding flows,
multi-page applications, intake questionnaires.

## What you'll install

Nothing extra — wizards are built from `@molecule/app-ui-react` form
primitives + local state. (If a `@molecule/app-stepper-react` exists
in the catalog you read in `molecule-packages` SKILL.md, use it for
the visual stepper; otherwise hand-roll a `<nav>` of step buttons.)

## Files in this example

| Path                             | What it does                                                               |
| -------------------------------- | -------------------------------------------------------------------------- |
| `api/handlers/onboarding.ts`     | Single `POST /onboarding` endpoint receives the full payload after step N. |
| `app/pages/OnboardingWizard.tsx` | Step state machine + per-step subforms + Next / Back / Finish controls.    |

## Anti-patterns

- Do not POST after every step unless you genuinely need partial
  saves. A single POST at the end is simpler.
- Do not store wizard state in URL query params and ALSO local
  state — pick one source of truth (URL is best for back-button
  semantics).
- Do not let users skip required steps via the back button — the
  Next button on each step controls whether the next step is reachable.
- Do not invent `@molecule/app-wizard` or `@molecule/app-onboarding`.
  Wizards are local state.

## Verify

Step 1: enter name → Next disabled until name is filled → Next →
step 2 → fill → Next → step 3 → review → Finish → POST happens →
success page.
