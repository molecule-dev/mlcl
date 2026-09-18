---
name: role-based-access
intent: |
  - "Roles / permissions"
  - "Admin vs member vs viewer"
  - "RBAC"
  - "Restrict access by role"
  - "Permission system"
keywords: [rbac, role, permission, admin, member, viewer, access-control]
---

# Role-based access control (viewer / member / editor / admin)

**When to copy this example:** the user wants different users to see
different things based on a role. Pairs with any auth example —
read `auth/email-password-login/` first.

## What you'll install

Nothing extra — RBAC is a `role` column + Express middleware. No
package needed. Avoid heavyweight libraries until you're enforcing
hundreds of permissions.

## Files in this example

| Path                             | What it does                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `api/middleware/require-role.ts` | `requireRole('admin')` and `requireAnyRole('admin', 'editor')`. Reads `res.locals.session.role`. |
| `api/handlers/posts.ts`          | Demonstrates: anyone can read; only `editor`+ can write; only `admin` can delete.                |

## Anti-patterns

- Do not invent `@molecule/api-rbac` — this simple `role` column +
  middleware is enough for a linear hierarchy. But `@molecule/api-permissions`
  IS real: reach for it (its `can` / `assign` / `revoke` with a provider
  bond like `-casbin`) once you outgrow a linear ladder — ≥3 roles AND
  ≥10 distinct permissions, or per-resource ABAC — instead of hand-rolling
  a permission matrix on top of this.
- Do not check roles in components only. Server-side enforcement
  is the only real gate; the UI just hides what the user can't do.
- Do not let admins demote themselves below admin if they're the
  last admin — the org gets stuck.
- Do not use string equality for role checks across an enum.
  Define `ROLES = ['viewer', 'member', 'editor', 'admin'] as const` and a
  helper that returns the index, so `roleAtLeast('editor')` works.

## Verify

Viewer and Member see the post list but no Edit button. Editor sees Edit on
their own posts. Admin sees Delete on every post. Direct API call
as Viewer to `DELETE /posts/:id` → 403.
