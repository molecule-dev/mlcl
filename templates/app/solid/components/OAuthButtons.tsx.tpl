import { Show, For } from 'solid-js'
import type { IconName } from '@molecule/app-icons'
import { createOAuth, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'
import { oauthConfig } from '../config.js'

export function OAuthButtons() {
  const cm = getClassMap()
  const t = useTranslate()
  const { providers, redirect } = createOAuth(oauthConfig)

  const providerLabels: Record<string, () => string> = {
    github: () => t('oauth.github'),
    google: () => t('oauth.google'),
    gitlab: () => t('oauth.gitlab'),
    twitter: () => t('oauth.twitter'),
  }
  // The brand icon for each provider the icon set draws. Any other provider's
  // button keeps its aria-label and shows no icon, as in the Vue and Angular buttons.
  const providerIcons: Partial<Record<string, IconName>> = {
    github: 'github',
    google: 'google',
    gitlab: 'gitlab',
    twitter: 'twitter',
  }

  return (
    <Show when={providers().length > 0}>
      <div>
        <div class={cm.oauthDivider}>
          <div class={cm.oauthDividerLine} />
          <span class={cm.oauthDividerText}>{t('oauth.orContinueWith')}</span>
        </div>
        <div class={cm.oauthButtonGroup}>
          <For each={providers()}>
            {(provider) => (
              <button
                type="button"
                onClick={() => redirect(provider)}
                aria-label={`${t('oauth.continueWith')} ${providerLabels[provider]?.() || provider}`}
                class={cm.oauthButton}
              >
                <span class={cm.oauthButtonIcon}>
                  <Show when={providerIcons[provider]}>
                    {(name) => <Icon name={name()} size={30} />}
                  </Show>
                </span>
              </button>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
