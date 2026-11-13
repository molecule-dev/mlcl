import { onMount, Show } from 'solid-js'
import type { UserProfile } from '@molecule/app-auth'
import { getAuthClient, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-solid'
import { createProfileForm } from '../profile-form.js'

type AccountValues = {
  name: string
  email: string
}

/**
 * Account fields over the shared profile lifecycle. Background validation uses
 * the auth client's configured route, mapping and session ownership guards.
 *
 * `UserProfile.email` is optional (phone/handle accounts have none), so email is
 * validated only when non-empty and a blank email is never sent: clearing the
 * field leaves the stored address untouched, and a name-only account can still
 * save its name.
 */
export function AccountSection() {
  const cm = getClassMap()
  const t = useTranslate()
  const authClient = getAuthClient<UserProfile>()
  const profile = createProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })

  onMount(() => {
    // The auth client owns the route, response mapping and stale-read guards.
    // An older account read must not publish over a save or a different session.
    authClient.validateSession?.().catch((_error) => {
      // A provider's background validation must not cause an unhandled
      // rejection: render its auth state while the profile form reports
      // mutation failures.
    })
  })

  const name = profile.register('name')
  const email = profile.register('email', { email: true })
  const emailError = () => profile.getError('email')
  // `profile.error()` is `unknown`; render the failure's own message when it
  // is an Error, else the generic fallback (React reads the same two sources).
  const saveError = (): string | null => {
    const failure = profile.error()
    if (!failure) return null
    return failure instanceof Error
      ? failure.message
      : t('settings.failedToUpdateProfile', undefined, {
          defaultValue: 'Failed to update profile',
        })
  }
  const saveOnBlur =
    (onBlur: () => void): (() => void) =>
    () => {
      onBlur()
      void profile.submit()
    }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 class={cm.sectionHeading}>{t('settings.account')}</h3>
        <Show when={profile.isSubmitting()}>
          <Spinner size="xs" />
        </Show>
      </Flex>
      <form {...profile.formProps} class={cm.stack(3)}>
        <div>
          <label for="settings-name" class={cm.formLabelSmall}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <Input
            {...name}
            id="settings-name"
            type="text"
            onBlur={saveOnBlur(name.onBlur)}
            autoComplete="name"
            size="sm"
          />
        </div>
        <div>
          <label for="settings-email" class={cm.formLabelSmall}>
            {t('settings.email')}
          </label>
          <Input
            {...email}
            id="settings-email"
            type="email"
            onBlur={saveOnBlur(email.onBlur)}
            autoComplete="email"
            size="sm"
            aria-invalid={emailError() ? true : undefined}
            aria-describedby={emailError() ? 'settings-email-error' : undefined}
          />
          <Show when={emailError()}>
            <p
              id="settings-email-error"
              role="alert"
              class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
            >
              {emailError()}
            </p>
          </Show>
          <Show when={saveError()}>
            {(message) => (
              <p role="alert" class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
                {message()}
              </p>
            )}
          </Show>
        </div>
      </form>
    </section>
  )
}
