<script setup lang="ts">
import { computed } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Spinner } from '@molecule/app-ui-vue'
import { useAuthClient, useTranslation } from '@molecule/app-vue'

import { useProfileForm } from './profileForm.js'

type AccountValues = {
  name: string
  email: string
}

const { t } = useTranslation()
const cm = getClassMap()
const authClient = useAuthClient<UserProfile>()

// Account fields over the shared profile lifecycle. Background validation uses
// the auth client's configured route, mapping and session ownership guards.
//
// `UserProfile.email` is optional (phone/handle accounts have none), so email is
// validated only when non-empty and a blank email is never sent: clearing the
// field leaves the stored address untouched, and a name-only account can still
// save its name.
const profile = useProfileForm<UserProfile, AccountValues>({
  defaultValues: { name: '', email: '' },
  toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
  toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  validators: { email: { email: true } },
})

// The auth client owns the route, response mapping and stale-read guards.
// An older account read must not publish over a save or a different session.
void authClient.validateSession?.().catch((_error) => {
  // A provider's background validation must not cause an unhandled rejection:
  // render its auth state while useProfileForm reports mutation failures.
})

const emailError = computed(() => profile.getError('email'))
const saveErrorText = computed(() => {
  const failure = profile.error.value
  if (!failure) return ''
  return failure instanceof Error
    ? failure.message
    : t('settings.failedToUpdateProfile', undefined, { defaultValue: 'Failed to update profile' })
})

// Save on blur: re-validate the field, then submit the whole profile form.
function saveOnBlur(name: keyof AccountValues & string): void {
  profile.blur(name)
  void profile.submit()
}
</script>

<template>
  <section>
    <Flex align="center" gap="sm" :class="cm.sp('mb', 3)">
      <h3 :class="cm.sectionHeading">{{ t('settings.account') }}</h3>
      <Spinner v-if="profile.isSubmitting.value" size="xs" />
    </Flex>
    <form :class="cm.stack(3)" @submit.prevent="profile.submit()">
      <div>
        <label for="settings-name" :class="cm.formLabelSmall">
          {{ t('settings.name', undefined, { defaultValue: 'Name' }) }}
        </label>
        <!-- The wrapper/input markup of `@molecule/app-ui-react`'s <Input>, inlined:
            the installed ui-vue Input neither forwards `autocomplete`/`aria-*` to
            the native element nor accepts them as props (its fallthrough attrs
            land on the outer <div>), and this field's autofill, name association
            and invalid state are load-bearing. -->
        <div :class="cm.inputWrapper">
          <div :class="cm.inputInner">
            <input
              id="settings-name"
              :value="profile.values.name"
              type="text"
              name="name"
              :class="cm.input({ size: 'sm' })"
              autocomplete="name"
              aria-invalid="false"
              @input="profile.edit('name', ($event.target as HTMLInputElement).value)"
              @blur="saveOnBlur('name')"
            />
          </div>
        </div>
      </div>
      <div>
        <label for="settings-email" :class="cm.formLabelSmall">
          {{ t('settings.email') }}
        </label>
        <div :class="cm.inputWrapper">
          <div :class="cm.inputInner">
            <input
              id="settings-email"
              :value="profile.values.email"
              type="email"
              name="email"
              :class="cm.input({ size: 'sm' })"
              autocomplete="email"
              :aria-invalid="emailError ? true : undefined"
              :aria-describedby="emailError ? 'settings-email-error' : undefined"
              @input="profile.edit('email', ($event.target as HTMLInputElement).value)"
              @blur="saveOnBlur('email')"
            />
          </div>
        </div>
        <p
          v-if="emailError"
          id="settings-email-error"
          role="alert"
          :class="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
        >
          {{ emailError }}
        </p>
        <p
          v-if="saveErrorText"
          role="alert"
          :class="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
        >
          {{ saveErrorText }}
        </p>
      </div>
    </form>
  </section>
</template>
