---
id: settings-update
intent: form-submit
title: Settings / profile update form
hooks: [useProfileForm, useTranslation]
---

# Settings / profile update

**When to use:** an account form that loads the signed-in user's profile and saves edits.

`useProfileForm` from `@molecule/app-react` owns hydration, dirty fields, submit snapshots, validation and the shared saved user. It composes the bonded forms and auth clients. Configure the API route, method and request envelope once in `authConfig` (`profileEndpoint`, `profileUpdateMethod`, `profileRequestBody`); `updateProfile` already maps, persists and publishes the server response.

```tsx
import type { UserProfile } from '@molecule/app-auth'
import { useProfileForm, useTranslation } from '@molecule/app-react'

interface AppUser extends UserProfile {
  bio: string | null
}
type Fields = { name: string; bio: string; password: string }

export function Settings() {
  const { t } = useTranslation()
  const profile = useProfileForm<AppUser, Fields>({
    defaultValues: { name: '', bio: '', password: '' },
    getIdentity: (user) => user.id,
    toValues: (user) => ({ name: user.name ?? '', bio: user.bio ?? '', password: '' }),
    toPatch: ({ password, ...changes }) => ({
      ...changes,
      ...(password?.trim() ? { password } : {}),
    }),
    onSaved: async (user) => {
      // Set/invalidate the app's profile query keys from THIS saved response.
      // Navigate only after the cache writes complete.
    },
  })

  return (
    <form {...profile.formProps}>
      <input {...profile.register('name', { required: true })} />
      <textarea {...profile.register('bio')} />
      <input {...profile.register('password')} type="password" autoComplete="new-password" />
      {profile.error ? (
        <p role="alert">{t('settings.saveFailed', undefined, { defaultValue: 'Save failed' })}</p>
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

Keep every control in `defaultValues` and `toValues`; normalize nullable text to `''` there. `toPatch` receives only changed fields and the complete submit-time value snapshot as its second argument. Preserve omitted fields. Convert an explicitly cleared field to null only if the API requires null. An API with a separate password-change endpoint uses `useChangePassword` in its security form; the optional password above is for APIs that accept it in the profile patch.

Attach `formProps` to the actual native `<form>` and pass `register` props to the actual input/textarea. A custom button must forward `type="submit"`. Display `profile.formState.errors` for validation failures and `profile.error` for save failures. `onSaved` is awaited; a failed cache propagation can be retried without repeating the accepted mutation.

**Verify:** load the form, edit a field, let a background user refresh finish, submit, and assert the request contains the typed value. Read the saved value independently from the API, visit the profile/header, then reload the form. Include an omitted optional password and an explicitly cleared field. A 200 response alone does not prove the intended values were submitted or persisted.
