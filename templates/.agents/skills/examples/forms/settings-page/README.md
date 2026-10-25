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

## Use the shared profile form first

A molecule app already bonds the auth client (`src/bonds/auth-default.ts`, handed to
`MoleculeProvider`). For the signed-in user's OWN profile, use `useProfileForm` from
`@molecule/app-react` instead of the hand-written state in this slice: it fills pristine
fields when the user arrives without replacing edits, submits only the changed fields
through the bonded client, and publishes the saved user to every `useAuth()`. The default
user resource answers a save with the changed fields only, so keep the page's `onSaved`
merge. `.agents/skills/patterns/settings-update.md` shows the form.

The client sends the save to `authConfig.profileEndpoint` in `src/config.ts`. An app from
the default scaffold already routes it to the user resource (`PATCH /users/:id`), and its
`app/src/pages/Settings.tsx` is that form. An app from a template has no
`profileEndpoint`: add it first (the pattern shows the two lines), or the save goes to the
client's built-in `/auth/profile`, which no molecule resource serves. A Settings page that
does not call `useProfileForm` is a different page.

Copy this slice only when the app edits a profile the shared client does NOT own — a
different user's record, an org profile, or an API whose write route is not the user
resource — or as a reference for the save/error/dirty-state treatment.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-resource-user --workspace=api
# Form primitives are in @molecule/app-ui-react (already in every project)
```

Run the user resource's `src/__setup__/users.sql` and `src/__setup__/usersSecrets.sql` migrations through the app's migration runner before using these handlers. Keep the scaffold's existing migrations when it already includes the user resource, and add a migration for the example's app-specific `timezone` column.

## Files in this example

| Path                         | What it does                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `api/handlers/me.ts`         | `GET /me` returns current user; `PATCH /me` validates + updates fields.              |
| `app/pages/SettingsPage.tsx` | Form with name + email + timezone; tracks dirty state, disables Save when unchanged. |
| `app/locales/en/settings.ts` | Field labels, placeholders, success / error messages.                                |

## Anti-patterns

- Do not invent `@molecule/app-settings`. Settings is a normal form
  on top of the user resource.
- Do not fill the signed-in user's profile from a `useEffect([user])`. That effect
  re-runs when a background refresh lands and overwrites what was typed; the submit then
  sends the overwritten values. Use `useProfileForm` for that form (above).
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
