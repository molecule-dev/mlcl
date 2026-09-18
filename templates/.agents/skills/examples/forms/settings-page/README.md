---
name: settings-page
intent: |
  - "A settings page"
  - "Account settings / profile settings"
  - "Preferences page"
  - "Update my profile"
  - "Change my email / password / display name"
keywords: [settings, preferences, account, profile, edit, update]
---

# Settings page (account form with save / dirty state)

**When to copy this example:** the user wants any "edit your own
account info" page. Same pattern works for org settings,
notification preferences, etc.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-resource-user --workspace=api
# Form primitives are in @molecule/app-ui-react (already in every project)
```

## Files in this example

| Path                         | What it does                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `api/handlers/me.ts`         | `GET /me` returns current user; `PATCH /me` validates + updates fields.              |
| `app/pages/SettingsPage.tsx` | Form with name + email + timezone; tracks dirty state, disables Save when unchanged. |
| `app/locales/en/settings.ts` | Field labels, placeholders, success / error messages.                                |

## Anti-patterns

- Do not invent `@molecule/app-settings`. Settings is a normal form
  on top of the user resource.
- Do not write a single giant settings page with 30 fields. Group
  into tabs (Profile, Security, Notifications) — each tab is its
  own form.
- Do not allow the password change in the same form as profile
  fields. Password updates re-authenticate the user; isolate that
  flow in its own page or modal.
- Do not update the email without resetting `emailVerified`. A
  changed address is unproven — leave the flag true and it vouches
  for an inbox the user never controlled. The handler flips it to
  false on change; wire `auth/email-verification` to re-send.
- Do not skip the "save successful" feedback. Users can't tell if
  their click did anything otherwise.

## Verify

Load page → fields prefilled from `/me` → edit name → Save enables →
click Save → success toast → refresh → name persists.
