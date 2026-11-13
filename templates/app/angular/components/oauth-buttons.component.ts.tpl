import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { AUTH_CLIENT, createOAuthState, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import type { Subscription } from 'rxjs'
import { OAuthProviderLogoComponent } from './oauth-provider-logo.component.js'
import { oauthConfig } from '../config.js'

/** Canonical i18n key + English default per provider (mirrors `labels.ts`). */
const PROVIDER_LABELS: Readonly<Record<string, { key: string; default: string }>> = Object.freeze({
  github: { key: 'oauthButtons.provider.github', default: 'GitHub' },
  gitlab: { key: 'oauthButtons.provider.gitlab', default: 'GitLab' },
  google: { key: 'oauthButtons.provider.google', default: 'Google' },
  twitter: { key: 'oauthButtons.provider.twitter', default: 'Twitter' },
  x: { key: 'oauthButtons.provider.x', default: 'X' },
  apple: { key: 'oauthButtons.provider.apple', default: 'Apple' },
  facebook: { key: 'oauthButtons.provider.facebook', default: 'Facebook' },
  microsoft: { key: 'oauthButtons.provider.microsoft', default: 'Microsoft' },
  linkedin: { key: 'oauthButtons.provider.linkedin', default: 'LinkedIn' },
  discord: { key: 'oauthButtons.provider.discord', default: 'Discord' },
})

/** Providers that have a brand mark (the rest render an icon-only button). */
const PROVIDERS_WITH_LOGO = new Set(Object.keys(PROVIDER_LABELS))

/**
 * The i18n entry for a provider id, with a synthesized entry for unknown ids so
 * an unrecognized provider still renders a sensible label.
 *
 * @param provider - The provider id.
 * @returns The translation key and English default.
 */
function providerLabel(provider: string): { key: string; default: string } {
  const entry = PROVIDER_LABELS[provider]
  if (entry) return entry
  return {
    key: `oauthButtons.provider.${provider}`,
    default: provider.charAt(0).toUpperCase() + provider.slice(1),
  }
}

/**
 * Config-driven OAuth provider button row under a login/signup form.
 *
 * Port of `@molecule/app-auth-ui-react`'s `OAuthButtons` composed over
 * `@molecule/app-oauth-buttons-react`'s divider + row: the "or continue with"
 * rule, the callback-exchange failure rendered inline (`role="alert"`,
 * `data-mol-id="oauth-error"`), then one button per provider with its brand
 * mark, `aria-label`, `data-mol-id` and `data-provider`. Like React, the row
 * is icon-only (`showLabels` off) and ClassMap-neutral (`brandButtons` off).
 */
@Component({
  selector: 'app-oauth-buttons',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [OAuthProviderLogoComponent],
  template: `
    @if (providers.length > 0) {
      <div>
        <div [class]="cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }))">
          <span [class]="cm.cn(cm.flex1, cm.separator())"></span>
          <span>{{ t('oauth.orContinueWith', {}, { defaultValue: 'or continue with' }) }}</span>
          <span [class]="cm.cn(cm.flex1, cm.separator())"></span>
        </div>
        @if (error) {
          <div [class]="cm.authFormError" role="alert" data-mol-id="oauth-error">{{ error }}</div>
        }
        <div
          [class]="cm.oauthButtonGroup"
          role="group"
          [attr.aria-label]="
            t('oauthButtons.groupLabel', undefined, {
              defaultValue: 'Continue with another account',
            })
          "
          data-mol-id="oauth-buttons"
          data-layout="horizontal"
        >
          @for (provider of providers; track provider) {
            <button
              type="button"
              (click)="redirect(provider)"
              [attr.aria-label]="
                t(providerLabel(provider).key, undefined, {
                  defaultValue: providerLabel(provider).default,
                })
              "
              [class]="cm.oauthButton"
              [attr.data-mol-id]="'oauth-button-' + provider"
              [attr.data-provider]="provider"
            >
              <span [class]="cm.oauthButtonIcon">
                @if (hasLogo(provider)) {
                  <svg appOAuthLogo [provider]="provider" [size]="30"></svg>
                }
              </span>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class OAuthButtonsComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly oauthManager = createOAuthState({
    ...oauthConfig,
    authClient: inject(AUTH_CLIENT),
    onSuccess: () => {
      this.error = ''
      this.cdr.markForCheck()
    },
    onError: (message: string) => {
      // The message is the api's (localized) error body or the hook's fallback —
      // render it so a failed callback is never invisible.
      this.error = message
      this.cdr.markForCheck()
    },
  })
  private subscriptions: Subscription[] = []

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The configured providers, de-duplicated in the caller's order. */
  providers: string[] = []
  /** The last callback-exchange failure, rendered inline. */
  error = ''

  ngOnInit(): void {
    this.subscriptions.push(
      this.oauthManager.providers$.subscribe((providers) => {
        const seen = new Set<string>()
        this.providers = providers.filter((provider) => {
          if (seen.has(provider)) return false
          seen.add(provider)
          return true
        })
        this.cdr.markForCheck()
      }),
      this.oauthManager.error$.subscribe((message) => {
        if (!message) return
        this.error = message
        this.cdr.markForCheck()
      }),
    )
  }

  /**
   * The i18n entry for a provider id.
   *
   * @param provider - The provider id.
   * @returns The translation key and English default.
   */
  providerLabel(provider: string): { key: string; default: string } {
    return providerLabel(provider)
  }

  /**
   * Whether the provider has a brand mark to render.
   *
   * @param provider - The provider id.
   * @returns True when a logo is registered for the provider.
   */
  hasLogo(provider: string): boolean {
    return PROVIDERS_WITH_LOGO.has(provider)
  }

  /**
   * Starts the full-page OAuth redirect flow for a provider.
   *
   * @param provider - The provider id.
   */
  redirect(provider: string): void {
    this.oauthManager.redirect(provider)
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.oauthManager.destroy()
  }
}
