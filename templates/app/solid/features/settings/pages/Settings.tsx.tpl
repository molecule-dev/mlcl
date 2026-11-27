/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `useProfileForm` owns the whole load → edit → submit → publish lifecycle, so this page
 * never seeds its controls from a `createEffect([user])`: that effect is what erases a typed
 * bio or avatar when a background refresh lands, and the submit that follows sends blanks.
 * The primitive fills pristine fields when the signed-in user arrives, keeps dirty controls,
 * sends only the fields that changed, and publishes the saved user to every `useAuth()`.
 *
 * The API's user resource answers a save with the CHANGED fields only (`{ props: { bio } }`),
 * which the scaffold's JWT auth client merges onto the current signed-in profile before
 * storing, publishing and returning it. The primitive receives that merged profile too, so
 * no page-level merge is needed. Optional `onSaved` work uses it for other caches/navigation.
 * A custom provider must return its saved profile; the primitive does not merge raw deltas.
 *
 * Adapt it to this app's profile:
 * - widen `AppUser` and `Fields` with the app's own columns, and map them in `toValues`;
 * - map ONLY changed fields in `toPatch` (an omitted field stays omitted — never turn it
 *   into `null` unless the API requires that), and normalize nullable text to `''` in `toValues`;
 * - the write route and method come from `authConfig.profileEndpoint` /
 *   `profileUpdateMethod` in `src/config.ts` — change the API wiring THERE, not here.
 *
 * A password change is not part of this page: the user resource serves it from its own
 * route, so put it in a security section with `useChangePassword`. Every string goes
 * through `t()` with an inline English fallback; every element a test drives carries
 * `data-mol-id`. Control ids come from `createUniqueId()`: the header drawer's account
 * section is mounted over this page and has its own name field.
 */
import type { RouteSectionProps } from '@solidjs/router'
import { createUniqueId, Show } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { useI18nError, useProfileForm, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
export interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/**
 * The controlled values this form edits; every one of them is a field an input renders.
 * A type alias or an interface can name these controlled values.
 */
type Fields = {
  name: string
  username: string
  bio: string
  avatar: string
}

const EMPTY: Fields = { name: '', username: '', bio: '', avatar: '' }

/**
 * App-specific post-save work; the form owns saving and publishing the user first.
 * The router's props ride along so the page registers directly as a route component.
 */
export type SettingsProps = {
  onSaved?: (user: AppUser) => void | Promise<void>
} & RouteSectionProps

export function Settings(props: SettingsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const id = createUniqueId()
  const profile = useProfileForm<AppUser, Fields>({
    defaultValues: EMPTY,
    toValues: (user) => ({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
    }),
    toPatch: (changes) => changes,
    onSaved: props.onSaved,
  })
  // React spreads `profile.register(name)`, and React re-writes a controlled input's
  // value on every render. Solid's component body runs once, and its JSX spread
  // re-reads the object's properties in a tracking scope — so the registration's
  // value rides a getter over the form state: pristine fields fill when the signed-in
  // user arrives, and a save that rewrites a field behind typed text restores it.
  const bindField = (name: keyof Fields & string) => {
    const registration = profile.register(name)
    return {
      name: registration.name,
      get value() {
        return profile.formState().values[name]
      },
      onChange: registration.onChange,
      onBlur: registration.onBlur,
      ref: registration.ref,
    }
  }
  // `profile.error()` is `unknown`; the auth client rejects a save with an `I18nError`
  // (the server's reason key), which this translates in the current locale. React
  // passes the hook the failure it read on that render; Solid's component body runs
  // once, so the hook takes an accessor and re-translates on a changed failure or a
  // locale switch (the same `MaybeAccessor` shape every widened binding hook takes).
  const failure = (): Error | null => {
    const error = profile.error()
    return error instanceof Error ? error : null
  }
  const reason = useI18nError(failure)

  return (
    <section class={cm.cn(cm.sp('py', 8), cm.sp('px', 4))}>
      <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('nav.settings', undefined, { defaultValue: 'Settings' })}
      </h1>
      <form {...profile.formProps} class={cm.stack(4)} data-mol-id="settings-form">
        <div>
          <label class={cm.formLabelSmall} for={`${id}-name`}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <input
            id={`${id}-name`}
            class={cm.input()}
            autocomplete="name"
            data-mol-id="settings-name"
            {...bindField('name')}
          />
        </div>
        <div>
          <label class={cm.formLabelSmall} for={`${id}-username`}>
            {t('auth.username', undefined, { defaultValue: 'Username' })}
          </label>
          <input
            id={`${id}-username`}
            class={cm.input()}
            autocomplete="username"
            data-mol-id="settings-username"
            {...bindField('username')}
          />
        </div>
        <div>
          <label class={cm.formLabelSmall} for={`${id}-bio`}>
            {t('form.bio', undefined, { defaultValue: 'Bio' })}
          </label>
          <textarea
            id={`${id}-bio`}
            class={cm.textarea()}
            rows={4}
            data-mol-id="settings-bio"
            {...bindField('bio')}
          />
        </div>
        <div>
          <label class={cm.formLabelSmall} for={`${id}-avatar`}>
            {t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })}
          </label>
          <input
            id={`${id}-avatar`}
            class={cm.input()}
            autocomplete="url"
            data-mol-id="settings-avatar"
            {...bindField('avatar')}
          />
        </div>
        <div class={cm.sp('mt', 2)}>
          <button
            type="submit"
            class={cm.button({ variant: 'solid' })}
            disabled={!profile.ready() || profile.isSubmitting()}
            data-mol-id="settings-save"
          >
            {profile.isSubmitting()
              ? t('common.saving', undefined, { defaultValue: 'Saving...' })
              : t('common.saveChanges', undefined, { defaultValue: 'Save changes' })}
          </button>
          <button
            type="button"
            class={cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))}
            onClick={profile.reset}
            data-mol-id="settings-cancel"
          >
            {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </button>
        </div>
        <Show when={profile.error()}>
          <p role="alert" class={cm.formError} data-mol-id="settings-error">
            {t('common.couldNotSaveChanges', undefined, {
              defaultValue: 'Could not save changes.',
            })}
            {reason() ? ` ${reason()}` : null}
          </p>
        </Show>
      </form>
    </section>
  )
}
