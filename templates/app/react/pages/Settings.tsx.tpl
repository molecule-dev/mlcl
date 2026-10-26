/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `useProfileForm` owns the whole load → edit → submit → publish lifecycle, so this page
 * never seeds its controls from a `useEffect([user])`: that effect is what erases a typed
 * bio or avatar when a background refresh lands, and the submit that follows sends blanks.
 * The hook fills pristine fields when the signed-in user arrives, keeps dirty controls,
 * sends only the fields that changed, and publishes the saved user to every `useAuth()`.
 *
 * The API's user resource answers a save with the CHANGED fields only (`{ props: { bio } }`),
 * which the scaffold's JWT auth client merges onto the current signed-in profile before
 * storing, publishing and returning it. The hook receives that merged profile too, so
 * no page-level merge is needed. Optional `onSaved` work uses it for other caches/navigation.
 * A custom provider must return its saved profile; the hook does not merge raw deltas.
 *
 * Adapt it to this app's profile:
 * - widen `AppUser` and `Fields` with the app's own columns, and map them in `toValues`;
 * - map ONLY changed fields in `toPatch` (an omitted field stays omitted — never turn it
 *   into `null` unless the API requires that), and normalize nullable text to `''` there;
 * - the write route and method come from `authConfig.profileEndpoint` /
 *   `profileUpdateMethod` in `src/config.ts` — change the API wiring THERE, not here.
 *
 * A password change is not part of this page: the user resource serves it from its own
 * route, so put it in a security section with `useChangePassword`. Every string goes
 * through `t()` with an inline English fallback; every element a test drives carries
 * `data-mol-id`. Control ids come from `useId()`: the header drawer's account section is
 * mounted over this page and has its own name field.
 */
import { type JSX, useId } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useI18nError, useProfileForm, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/**
 * The controlled values this form edits; every one of them is a field an input renders.
 * A TYPE alias, not an interface: the hook's values parameter is `Record<string, unknown>`,
 * which an interface (no index signature) does not satisfy.
 */
type Fields = {
  name: string
  username: string
  bio: string
  avatar: string
}

const EMPTY: Fields = { name: '', username: '', bio: '', avatar: '' }

export function Settings(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const id = useId()
  const profile = useProfileForm<AppUser, Fields>({
    defaultValues: EMPTY,
    toValues: (user) => ({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
    }),
    toPatch: (changes) => changes,
  })
  // `profile.error` is `unknown`; the auth client rejects a save with an `I18nError` (the
  // server's reason key), which this translates in the current locale.
  const reason = useI18nError(profile.error instanceof Error ? profile.error : null)

  return (
    <section className={cm.cn(cm.sp('py', 8), cm.sp('px', 4))}>
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('settings.title', undefined, { defaultValue: 'Your settings' })}
      </h1>
      <form {...profile.formProps} className={cm.stack(4)} data-mol-id="settings-form">
        <div>
          <label className={cm.formLabelSmall} htmlFor={`${id}-name`}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <input
            id={`${id}-name`}
            className={cm.input()}
            autoComplete="name"
            data-mol-id="settings-name"
            {...profile.register('name')}
          />
        </div>
        <div>
          <label className={cm.formLabelSmall} htmlFor={`${id}-username`}>
            {t('settings.username', undefined, { defaultValue: 'Username' })}
          </label>
          <input
            id={`${id}-username`}
            className={cm.input()}
            autoComplete="username"
            data-mol-id="settings-username"
            {...profile.register('username')}
          />
        </div>
        <div>
          <label className={cm.formLabelSmall} htmlFor={`${id}-bio`}>
            {t('settings.bio', undefined, { defaultValue: 'Bio' })}
          </label>
          <textarea
            id={`${id}-bio`}
            className={cm.textarea()}
            rows={4}
            data-mol-id="settings-bio"
            {...profile.register('bio')}
          />
        </div>
        <div>
          <label className={cm.formLabelSmall} htmlFor={`${id}-avatar`}>
            {t('settings.avatar', undefined, { defaultValue: 'Avatar URL' })}
          </label>
          <input
            id={`${id}-avatar`}
            className={cm.input()}
            autoComplete="url"
            data-mol-id="settings-avatar"
            {...profile.register('avatar')}
          />
        </div>
        <div className={cm.sp('mt', 2)}>
          <button
            type="submit"
            className={cm.button({ variant: 'solid' })}
            disabled={!profile.ready || profile.isSubmitting}
            data-mol-id="settings-save"
          >
            {profile.isSubmitting
              ? t('common.saving', undefined, { defaultValue: 'Saving...' })
              : t('settings.save', undefined, { defaultValue: 'Save changes' })}
          </button>
          <button
            type="button"
            className={cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))}
            onClick={profile.reset}
            data-mol-id="settings-cancel"
          >
            {t('settings.cancel', undefined, { defaultValue: 'Cancel' })}
          </button>
        </div>
        {profile.error ? (
          <p role="alert" className={cm.formError} data-mol-id="settings-error">
            {t('settings.saveFailed', undefined, { defaultValue: 'Could not save your changes.' })}
            {reason ? ` ${reason}` : null}
          </p>
        ) : null}
      </form>
    </section>
  )
}
