<script lang="ts">
  import { authClient } from '$lib/bonds/index.js'

  import type { UserProfile } from '@molecule/app-auth'
  import { createAuthStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex, Input, Spinner } from '@molecule/app-ui-svelte'

  import { createProfileFormStores } from '../../lib/profile-form.js'

  /** Account values edited here (the shared profile lifecycle's fields). */
  interface AccountValues {
    name: string
    email: string
  }

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { user } = createAuthStores<UserProfile>()

  // Background validation uses the auth client's configured route, mapping
  // and session ownership guards. `UserProfile.email` is optional
  // (phone/handle accounts have none), so email is validated only when
  // non-empty and a blank email is never sent: clearing the field leaves the
  // stored address untouched, and a name-only account can still save its name.
  const profile = createProfileFormStores<UserProfile, AccountValues>(authClient, {
    defaultValues: { name: '', email: '' },
    toValues: (account) => ({ name: account.name ?? '', email: account.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })

  // Fills pristine fields when the signed-in user arrives; a same-account
  // background refresh keeps the fields the person has edited.
  $effect(() => {
    profile.hydrate($user)
  })

  $effect(() => {
    // The auth client owns the route, response mapping and stale-read guards.
    // An older account read must not publish over a save or a different session.
    authClient.validateSession?.().catch((_error) => {
      // A provider's background validation must not cause an unhandled
      // rejection: render its auth state while the profile form reports
      // mutation failures.
    })
  })

  // The stores destructure off the helper; read them with `$` in the template.
  const { formState: profileState, error: profileError } = profile

  // The event bindings are created ONCE, during initialisation. The rendered
  // VALUES come from the reactive form-state store below: a registration's
  // `value` is a snapshot of the form controller, which is not a Svelte store,
  // so a `$derived` over it would never see a hydrate or a reset.
  const nameField = profile.register('name')
  const emailField = profile.register('email', { email: true })
  let values = $derived($profileState.values)
  let emailError = $derived($profileState.errors['email'])
  let isSubmitting = $derived($profileState.isSubmitting)

  const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

  // Blur saves the field: the drawer's sections update one field at a time.
  const saveOnBlur = (onBlur: () => void) => (): void => {
    onBlur()
    void profile.submit()
  }
</script>

<section>
  <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
    <h3 class={cm.sectionHeading}>{$t('settings.account')}</h3>
    {#if isSubmitting}
      <Spinner size="xs" />
    {/if}
  </Flex>
  <form onsubmit={profile.formProps.onsubmit} class={cm.stack(3)}>
    <div>
      <label for="settings-name" class={cm.formLabelSmall}>
        {$t('settings.name', undefined, { defaultValue: 'Name' })}
      </label>
      <Input
        id="settings-name"
        name="name"
        type="text"
        value={asText(values.name)}
        onChange={nameField.onChange}
        onBlur={saveOnBlur(nameField.onBlur)}
        autocomplete="name"
        size="sm"
      />
    </div>
    <div>
      <label for="settings-email" class={cm.formLabelSmall}>
        {$t('settings.email')}
      </label>
      <Input
        id="settings-email"
        name="email"
        type="email"
        value={asText(values.email)}
        onChange={emailField.onChange}
        onBlur={saveOnBlur(emailField.onBlur)}
        autocomplete="email"
        size="sm"
        aria-invalid={emailError ? 'true' : undefined}
        aria-describedby={emailError ? 'settings-email-error' : undefined}
      />
      {#if emailError}
        <p
          id="settings-email-error"
          role="alert"
          class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
        >
          {emailError}
        </p>
      {/if}
      {#if $profileError}
        <p role="alert" class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
          {$profileError instanceof Error
            ? $profileError.message
            : $t('settings.failedToUpdateProfile', undefined, {
                defaultValue: 'Failed to update profile',
              })}
        </p>
      {/if}
    </div>
  </form>
</section>
