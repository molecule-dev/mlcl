---
id: settings-update
intent: form-submit
title: Settings / profile update form
hooks: [useProfileForm, useAuthClient, useI18nError, useTranslation]
---

# Settings / profile update

**When to use:** an account form that loads the signed-in user's profile and saves edits.

`useProfileForm` from `@molecule/app-react` owns hydration, dirty fields, submit snapshots, validation and the shared saved user. It composes the bonded forms and auth clients; `updateProfile` sends the patch and stores the server answer as the signed-in user. The default user resource (`PATCH /users/:id`) answers a save with the CHANGED fields only (`{ props: { bio } }`), so `onSaved` merges that answer onto the profile the save was sent for — without it the form, every `useAuth()` reader and the next save route lose every field the save did not touch.

Configure the API route, method and request envelope once in `authConfig` in `src/config.ts` (`profileEndpoint`, `profileUpdateMethod`, `profileRequestBody`). An app from the default scaffold already routes the save to the user resource, and its `app/src/pages/Settings.tsx` is the form below. Without a `profileEndpoint` (apps from a template have none) the client sends the save to its built-in `/auth/profile`, which no molecule resource serves, so add the user resource's route first. A Settings page that does not call `useProfileForm` is a different page.

```ts
// src/config.ts
export const authConfig = {
  // …the existing endpoints, then:
  profileEndpoint: (user: { id: string }) => `/users/${encodeURIComponent(user.id)}`,
  profileUpdateMethod: 'PATCH' as const,
}
```

```tsx
import { useRef } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuthClient, useI18nError, useProfileForm, useTranslation } from '@molecule/app-react'

interface AppUser extends UserProfile {
  bio: string | null
}
type Fields = { name: string; bio: string; password: string }

export function Settings() {
  const { t } = useTranslation()
  const client = useAuthClient<AppUser>()
  // The signed-in profile a save was sent for: `toPatch` runs right before the request.
  const savedFrom = useRef<AppUser | null>(null)
  const profile = useProfileForm<AppUser, Fields>({
    defaultValues: { name: '', bio: '', password: '' },
    toValues: (user) => ({ name: user.name ?? '', bio: user.bio ?? '', password: '' }),
    toPatch: ({ password, ...changes }) => {
      savedFrom.current = client.getUser()
      return { ...changes, ...(password?.trim() ? { password } : {}) }
    },
    onSaved: async (saved) => {
      // A changed-fields answer carries no `id`: merge it onto the profile it was saved from.
      const answer: Partial<AppUser> = saved
      const from = savedFrom.current
      savedFrom.current = null
      const user = from && answer.id === undefined ? { ...from, ...answer } : saved
      if (user !== saved) client.setUser(user)
      // Then set/invalidate the app's profile query keys from `user` (never from `saved` or
      // the submitted patch). Navigate only after the cache writes complete.
    },
  })
  const reason = useI18nError(profile.error instanceof Error ? profile.error : null)

  return (
    <form {...profile.formProps}>
      <input {...profile.register('name', { required: true })} />
      <textarea {...profile.register('bio')} />
      <input {...profile.register('password')} type="password" autoComplete="new-password" />
      {profile.error ? (
        <p role="alert">
          {t('settings.saveFailed', undefined, { defaultValue: 'Save failed' })}
          {reason ? ` ${reason}` : null}
        </p>
      ) : null}
      <button type="submit" disabled={!profile.ready || profile.isSubmitting}>
        {t('settings.save', undefined, { defaultValue: 'Save changes' })}
      </button>
      <button type="button" onClick={profile.reset}>
        {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
      </button>
    </form>
  )
}
```

The built-in auth client provides session ownership through `getSessionRevision()`, so the default form needs no `getIdentity`. For a legacy or custom provider without that capability, supply `getIdentity` with an immutable account identifier; an editable username or email is not stable enough.

Keep every control in `defaultValues` and `toValues`; normalize nullable text to `''` there. `toPatch` receives only changed fields and the complete submit-time value snapshot as its second argument. Preserve omitted fields. Convert an explicitly cleared field to null only if the API requires null. An API with a separate password-change endpoint uses `useChangePassword` in its security form; the optional password above is for APIs that accept it in the profile patch.

Attach `formProps` to the actual native `<form>` and pass `register` props to the actual input/textarea. A custom button must forward `type="submit"`. Display `profile.formState.errors` for validation failures, and `useI18nError` for save failures: it renders the server reason (`user.error.usernameUnavailable`) in the current locale. `profile.error` is `unknown`, so pass it only when it is an `Error`, as above. `onSaved` is awaited; a failed cache propagation can be retried without repeating the accepted mutation.

**Verify:** load the form, edit a field, let a background user refresh finish, submit, and assert the request contains the typed value. Read the saved value independently from the API, assert the untouched fields still show in the form and in a `useAuth()` reader, save a second time, then reload the form. Include an omitted optional password and an explicitly cleared field. A 200 response alone does not prove the intended values were submitted or persisted.
