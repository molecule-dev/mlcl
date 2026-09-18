import { Component, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { createOAuthState, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { IconComponent } from './icon.component.js'
import { oauthConfig } from '../config.js'

const providerLabels: Record<string, () => string> = {
  github: () => t('oauth.github'),
  google: () => t('oauth.google'),
  gitlab: () => t('oauth.gitlab'),
  twitter: () => t('oauth.twitter'),
}

@Component({
  selector: 'app-oauth-buttons',
  standalone: true,
  imports: [AsyncPipe, IconComponent],
  template: `
    @if (providers$ | async; as providers) {
      @if (providers.length > 0) {
        <div>
          <div [class]="cm.oauthDivider">
            <div [class]="cm.oauthDividerLine"></div>
            <span [class]="cm.oauthDividerText">
              {{ t('oauth.orContinueWith') }}
            </span>
          </div>
          <div [class]="cm.oauthButtonGroup">
            @for (provider of providers; track provider) {
              <button
                type="button"
                (click)="redirect(provider)"
                [attr.aria-label]="t('oauth.continueWith') + ' ' + (getProviderLabel(provider))"
                [class]="cm.oauthButton"
              >
                <span [class]="cm.oauthButtonIcon">
                  @switch (provider) {
                    @case ('github') {
                      <app-icon name="github" [size]="30" />
                    }
                    @case ('google') {
                      <app-icon name="google" [size]="30" />
                    }
                    @case ('gitlab') {
                      <app-icon name="gitlab" [size]="30" />
                    }
                    @case ('twitter') {
                      <app-icon name="twitter" [size]="30" />
                    }
                    @default {
                      <span [class]="cm.oauthProviderLabel">{{
                        getProviderLabel(provider)
                      }}</span>
                    }
                  }
                </span>
              </button>
            }
          </div>
        </div>
      }
    }
  `,
})
export class OAuthButtonsComponent implements OnDestroy {
  private oauthManager = createOAuthState(oauthConfig)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  providerLabels = providerLabels

  providers$ = this.oauthManager.providers$

  getProviderLabel(provider: string): string {
    return providerLabels[provider]?.() || provider
  }

  redirect(provider: string): void {
    this.oauthManager.redirect(provider)
  }

  ngOnDestroy(): void {
    if ('destroy' in this.oauthManager) {
      ;(this.oauthManager as { destroy(): void }).destroy()
    }
  }
}
