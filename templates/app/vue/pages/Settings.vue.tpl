<script setup lang="ts">
/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `useProfileForm` (see components/settings-panel/profileForm.ts, the Vue port of
 * `@molecule/app-react`'s hook) owns the whole load → edit → submit → publish
 * lifecycle, so this page never seeds its controls from a watcher on the user:
 * that watcher is what erases a typed bio or avatar when a background refresh
 * lands, and the submit that follows sends blanks. The hook fills pristine
 * fields when the signed-in user arrives, keeps dirty controls, sends only the
 * fields that changed, and publishes the saved user to every `useAuth()`.
 *
 * The API's user resource answers a save with the CHANGED fields only (`{ props: { bio } }`),
 * which the scaffold's JWT auth client merges onto the current signed-in profile before
 * storing, publishing and returning it. The hook receives that merged profile too, so
 * no page-level merge is needed.
 *
 * A password change is not part of this page: the user resource serves it from its own
 * route, so put it in a security section (the header drawer's Authentication section
 * already carries one). Every string goes through `t()` with an inline English
 * fallback; every element a test drives carries `data-mol-id`. Control ids come from
 * Vue's useId(): the header drawer's account section is mounted over this page and
 * has its own name field.
 */
import { computed, useId } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { I18nError } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { useProfileForm } from '../components/settings-panel/profileForm.js'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
interface AppUser extends UserProfile {
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

const { t } = useTranslation()
const cm = getClassMap()
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
// server's reason key), which this translates in the current locale — the Vue port of
// `useI18nError`.
const reason = computed(() => {
  const failure = profile.error.value
  if (!(failure instanceof Error)) return null
  if (failure instanceof I18nError) {
    return t(failure.i18nKey, failure.i18nValues, { defaultValue: failure.message })
  }
  return failure.message
})
</script>

<template>
  <section :class="cm.cn(cm.sp('py', 8), cm.sp('px', 4))">
    <h1 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))">
      {{ t('settings.title', undefined, { defaultValue: 'Your settings' }) }}
    </h1>
    <form :class="cm.stack(4)" data-mol-id="settings-form" @submit.prevent="profile.submit()">
      <div>
        <label :for="`${id}-name`" :class="cm.formLabelSmall">
          {{ t('settings.name', undefined, { defaultValue: 'Name' }) }}
        </label>
        <input
          :id="`${id}-name`"
          :value="profile.values.name"
          name="name"
          :class="cm.input()"
          autocomplete="name"
          data-mol-id="settings-name"
          @input="profile.edit('name', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label :for="`${id}-username`" :class="cm.formLabelSmall">
          {{ t('settings.username', undefined, { defaultValue: 'Username' }) }}
        </label>
        <input
          :id="`${id}-username`"
          :value="profile.values.username"
          name="username"
          :class="cm.input()"
          autocomplete="username"
          data-mol-id="settings-username"
          @input="profile.edit('username', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label :for="`${id}-bio`" :class="cm.formLabelSmall">
          {{ t('settings.bio', undefined, { defaultValue: 'Bio' }) }}
        </label>
        <textarea
          :id="`${id}-bio`"
          :value="profile.values.bio"
          name="bio"
          rows="4"
          :class="cm.textarea()"
          data-mol-id="settings-bio"
          @input="profile.edit('bio', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
      <div>
        <label :for="`${id}-avatar`" :class="cm.formLabelSmall">
          {{ t('settings.avatar', undefined, { defaultValue: 'Avatar URL' }) }}
        </label>
        <input
          :id="`${id}-avatar`"
          :value="profile.values.avatar"
          name="avatar"
          :class="cm.input()"
          autocomplete="url"
          data-mol-id="settings-avatar"
          @input="profile.edit('avatar', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div :class="cm.sp('mt', 2)">
        <button
          type="submit"
          :class="cm.button({ variant: 'solid' })"
          :disabled="!profile.ready.value || profile.isSubmitting.value"
          data-mol-id="settings-save"
        >
          {{
            profile.isSubmitting.value
              ? t('common.saving', undefined, { defaultValue: 'Saving...' })
              : t('settings.save', undefined, { defaultValue: 'Save changes' })
          }}
        </button>
        <button
          type="button"
          :class="cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))"
          data-mol-id="settings-cancel"
          @click="profile.reset()"
        >
          {{ t('settings.cancel', undefined, { defaultValue: 'Cancel' }) }}
        </button>
      </div>
      <p v-if="profile.error.value" role="alert" :class="cm.formError" data-mol-id="settings-error">
        {{ t('settings.saveFailed', undefined, { defaultValue: 'Could not save your changes.' }) }}
        <template v-if="reason"> {{ reason }}</template>
      </p>
    </form>
  </section>
</template>
