---
name: multi-tenant-orgs
intent: |
  - "Teams / organizations"
  - "Multi-tenant"
  - "Workspace switcher"
  - "Invite teammates"
  - "Org-level settings vs user-level"
  - "B2B account model"
keywords: [team, org, workspace, multi-tenant, b2b, invite, tenants]
---

# Multi-tenant / orgs (compound — multi-feature roadmap)

**This isn't a single example.** Every B2B SaaS needs a way for
multiple users to share data within an organization. This is the
roadmap.

## Build order

1. **`auth/email-password-login/`** OR **`auth/oauth-google-login/`**
   — sign-in is per-user. After auth, the user picks (or creates)
   an org.
2. **`forms/multi-step-wizard/`** — adapt for org creation:
   "What's your team called?" → "Who else is on the team?" →
   "Pick a plan."
3. **`data-display/sortable-table/`** — for the members list inside
   each org.
4. **`forms/contact-form/`** — adapt for invite emails: enter
   teammate's email → email goes out with a join link.
5. **`compound/admin-panel/`** — the per-org admin panel
   (manage members, roles, billing).

## What you'll build on top

Custom code with no example coverage:

- **`organizations` table** + **`organization_members` table** with
  `(user_id, organization_id, role)` rows. Unique on
  `(user_id, organization_id)`.
- **Active-org middleware** — every authenticated request resolves
  `res.locals.session.organizationId` from a cookie or query param.
  Reject if the user isn't a member.
- **Resource scoping** — every domain table gets an
  `organization_id` column. Every query filters by it. Without
  this you have a privacy bug.
- **Workspace switcher dropdown** — a UI primitive listing the
  user's orgs; switching updates the active-org cookie.
- **Invite flow** — generate single-use signed token + email it.
  Recipient clicks → joins the org → token deleted.

## Anti-patterns

- Do not invent `@molecule/api-orgs`, `@molecule/api-tenants`, or
  `@molecule/app-workspace-switcher`. Multi-tenancy is a
  composition + custom middleware.
- Do not skip the `organization_id` column on per-org resources.
  Adding it later requires a backfill and a privacy audit.
- Do not let users belong to only one org. Even tiny B2B users
  ask for a 2nd org within weeks. Make the model multi-org from
  the start.
- Do not store the active org in localStorage only. Store it in a
  signed cookie so the API can authoritatively scope queries.
- Do not allow role escalation via `PATCH /members/:id`. Only
  org owners can change roles, and they cannot demote themselves
  unless another owner exists.

## Required env

Sum of base auth + email examples plus `INVITE_TOKEN_SECRET` for
signing invite tokens.

## Verify

User A signs up → creates "Acme" org → invites b@example.com →
user B accepts → member of Acme → A and B see the same Acme data
but neither sees data from another org. A creates a 2nd org "Beta"
→ workspace switcher shows both → switching changes which data is
visible.
