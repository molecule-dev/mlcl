<script lang="ts">
  // Your settings: one native profile form over the app's bonded auth client.
  //
  // `createProfileFormStores` owns the whole load → edit → submit → publish
  // lifecycle, so this page never seeds its controls from a background
  // arrival in a way that erases a typed bio or avatar: the store fills
  // pristine fields when the signed-in user arrives, keeps dirty controls,
  // sends only the fields that changed, and the auth client publishes the
  // saved user to every `createAuthStores()` consumer.
  //
  // The API's user resource answers a save with the CHANGED fields only
  // (`{ props: { bio } }`), which the scaffold's JWT auth client merges onto
  // the current signed-in profile before storing, publishing and returning
  // it. A custom provider must return its saved profile; the store does not
  // merge raw deltas.
  //
  // Adapt it to this app's profile:
  // - widen `AppUser` and `Fields` with the app's own columns, and map them
  //   in `toValues`;
  // - map ONLY changed fields in `toPatch` (an omitted field stays omitted —
  //   never turn it into `null` unless the API requires that), and normalize
  //   nullable text to `''` in `toValues`;
  // - the write route and method come from `authConfig.profileEndpoint` /
  //   `profileUpdateMethod` in `src/lib/config.ts` — change the API wiring
  //   THERE, not here.
  //
  // A password change is not part of this page: the user resource serves it
  // from its own route, so the settings drawer's Authentication section owns
  // it. Every string goes through `t()` with an inline English fallback;
  // every element a test drives carries `data-mol-id`. Control ids come from
  // the component instance id: the header drawer's account section is mounted
  // over this page and has its own name field.
  import { authClient } from '$lib/bonds/index.js'

  import type { UserProfile } from '@molecule/app-auth'
  import { I18nError } from '@molecule/app-i18n'
  import { createAuthStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { createProfileFormStores } from '../../lib/profile-form.js'

  /** The app's profile shape: the shared base fields plus the columns this app serves. */
  interface AppUser extends UserProfile {
    username?: string
    bio?: string
  }

  /**
   * The controlled values this form edits; every one of them is a field an
   * input renders.
   */
  interface Fields {
    name: string
    username: string
    bio: string
    avatar: string
  }

  const EMPTY: Fields = { name: '', username: '', bio: '', avatar: '' }

  const cm = getClassMap()
  const { t } = createI18nStores()

  // Control ids come from the component instance id: the header drawer's
  // account section is mounted over this page and has its own name field.
  const instanceId = $props.id()

  const profile = createProfileFormStores<AppUser, Fields>(authClient, {
    defaultValues: EMPTY,
    toValues: (user) => ({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
    }),
    toPatch: (changes) => changes,
  })

  // The stores destructure off the helper; read them with `$` in the template.
  const { formState: profileState, ready: profileReady, error: profileError } = profile
  const { user } = createAuthStores<AppUser>()

  // Fills pristine fields when the signed-in user arrives; keeps dirty
  // controls across a same-account background refresh.
  $effect(() => {
    profile.hydrate($user)
  })

  // The event bindings are created ONCE, during initialisation. The rendered
  // VALUES come from the reactive form-state store below: a registration's
  // `value` is a snapshot of the form controller, which is not a Svelte store,
  // so a `$derived` over it would never see a hydrate or a reset.
  const nameField = profile.register('name')
  const usernameField = profile.register('username')
  const bioField = profile.register('bio')
  const avatarField = profile.register('avatar')
  let values = $derived($profileState.values)

  // `profileError` is `unknown`; the auth client rejects a save with an
  // `I18nError` (the server's reason key), which this translates in the
  // current locale so the message follows language switches. A plain Error
  // renders its own message; anything else renders nothing.
  let reason = $derived(
    $profileError instanceof I18nError
      ? $t($profileError.i18nKey, $profileError.i18nValues, { defaultValue: $profileError.message })
      : $profileError instanceof Error
        ? $profileError.message
        : '',
  )

  const asText = (value: unknown): string => (typeof value === 'string' ? value : '')
</script>

<section class={cm.cn(cm.sp('py', 8), cm.sp('px', 4))}>
  <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
    {$t('settings.title', undefined, { defaultValue: 'Your settings' })}
  </h1>
  <form onsubmit={profile.formProps.onsubmit} class={cm.stack(4)} data-mol-id="settings-form">
    <div>
      <label class={cm.formLabelSmall} for={`${instanceId}-name`}>
        {$t('settings.name', undefined, { defaultValue: 'Name' })}
      </label>
      <input
        id={`${instanceId}-name`}
        name="name"
        class={cm.input()}
        autocomplete="name"
        data-mol-id="settings-name"
        value={asText(values.name)}
        oninput={nameField.onChange}
        onblur={nameField.onBlur}
      />
    </div>
    <div>
      <label class={cm.formLabelSmall} for={`${instanceId}-username`}>
        {$t('settings.username', undefined, { defaultValue: 'Username' })}
      </label>
      <input
        id={`${instanceId}-username`}
        name="username"
        class={cm.input()}
        autocomplete="username"
        data-mol-id="settings-username"
        value={asText(values.username)}
        oninput={usernameField.onChange}
        onblur={usernameField.onBlur}
      />
    </div>
    <div>
      <label class={cm.formLabelSmall} for={`${instanceId}-bio`}>
        {$t('settings.bio', undefined, { defaultValue: 'Bio' })}
      </label>
      <textarea
        id={`${instanceId}-bio`}
        name="bio"
        class={cm.textarea()}
        rows="4"
        data-mol-id="settings-bio"
        value={asText(values.bio)}
        oninput={bioField.onChange}
        onblur={bioField.onBlur}></textarea>
    </div>
    <div>
      <label class={cm.formLabelSmall} for={`${instanceId}-avatar`}>
        {$t('settings.avatar', undefined, { defaultValue: 'Avatar URL' })}
      </label>
      <input
        id={`${instanceId}-avatar`}
        name="avatar"
        class={cm.input()}
        autocomplete="url"
        data-mol-id="settings-avatar"
        value={asText(values.avatar)}
        oninput={avatarField.onChange}
        onblur={avatarField.onBlur}
      />
    </div>
    <div class={cm.sp('mt', 2)}>
      <button
        type="submit"
        class={cm.button({ variant: 'solid' })}
        disabled={!$profileReady || $profileState.isSubmitting}
        data-mol-id="settings-save"
      >
        {$profileState.isSubmitting
          ? $t('common.saving', undefined, { defaultValue: 'Saving...' })
          : $t('settings.save', undefined, { defaultValue: 'Save changes' })}
      </button>
      <button
        type="button"
        class={cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))}
        onclick={profile.reset}
        data-mol-id="settings-cancel"
      >
        {$t('settings.cancel', undefined, { defaultValue: 'Cancel' })}
      </button>
    </div>
    {#if $profileError}
      <p role="alert" class={cm.formError} data-mol-id="settings-error">
        {$t('settings.saveFailed', undefined, { defaultValue: 'Could not save your changes.' })}
        {reason ? ` ${reason}` : ''}
      </p>
    {/if}
  </form>
</section>
