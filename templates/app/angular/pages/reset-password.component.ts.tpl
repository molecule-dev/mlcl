import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import type { Subscription } from 'rxjs'

import { AUTH_CLIENT, createLoginState, createPasswordResetState, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ButtonComponent } from '../components/button.component.js'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { IconComponent } from '../components/icon.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'

/**
 * Reset-password page: confirms a reset token with a new password, then signs in.
 *
 * Port of the React `ResetPassword` page — the token and email are seeded from
 * the URL once (`?token=…&email=…`), the confirmation failure renders inline
 * with `role="alert"`, and a successful confirmation immediately logs in and
 * returns home.
 */
@Component({
  selector: 'app-reset-password',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [
    ButtonComponent,
    FloatingInputComponent,
    IconComponent,
    FooterComponent,
    ThemeToggleComponent,
  ],
  template: `
    <div [class]="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
      <header [class]="cm.cn(cm.headerBar, cm.headerFixed)">
        <div [class]="cm.authHeaderInner">
          <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h('full'))">
            <div [class]="cm.flex({ align: 'center', gap: 'xs' })">
              <img
                src="/logo.svg"
                [width]="LOGO_SIZE"
                [height]="LOGO_SIZE"
                alt=""
                [class]="cm.logoIcon"
              />
              <span [class]="cm.logoText">{{ APP_NAME }}</span>
            </div>
            <app-theme-toggle />
          </div>
        </div>
      </header>
      <main [class]="cm.authPageBody">
        <!-- Screen-reader-only page heading — every page needs exactly one h1
            (axe page-has-heading-one); the visual design has no heading. -->
        <h1 [class]="cm.srOnly">{{ t('auth.resetPassword.submit') }}</h1>
        <div [class]="cm.authFormWrapper">
          <form (submit)="onSubmit($event)">
            <div [class]="cm.authField">
              <app-floating-input
                type="email"
                [value]="email"
                (valueChange)="email = $event"
                autocomplete="email"
                [required]="true"
                [placeholder]="t('auth.resetPassword.email')"
              />
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="password"
                [value]="token"
                (valueChange)="token = $event"
                [required]="true"
                [placeholder]="t('auth.resetPassword.token')"
              />
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="password"
                [value]="password"
                (valueChange)="password = $event"
                autocomplete="new-password"
                [required]="true"
                [placeholder]="t('auth.resetPassword.newPassword')"
              />
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="number"
                [value]="twoFactorToken"
                (valueChange)="twoFactorToken = $event"
                autocomplete="one-time-code"
                [placeholder]="t('auth.resetPassword.twoFactor')"
              />
            </div>
            <div [class]="cm.authButtonRow">
              <button
                appButton
                type="button"
                size="lg"
                color="secondary"
                [className]="cm.authBackButton"
                (click)="navigateToLogin()"
                [attr.aria-label]="t('common.goBack')"
              >
                <svg appIcon name="arrow-left" [size]="25"></svg>
              </button>
              <button
                appButton
                type="submit"
                size="lg"
                color="success"
                [className]="cm.authSubmitButton"
                [disabled]="isLoggingIn"
              >
                {{
                  isLoggingIn ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')
                }}
              </button>
            </div>
          </form>
          @if (confirmError) {
            <div [class]="cm.authFormError" role="alert">{{ confirmError.message }}</div>
          }
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly client = inject(AUTH_CLIENT)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly resetManager = createPasswordResetState(this.client)
  private readonly loginManager = createLoginState(this.client)
  private subscriptions: Subscription[] = []

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t
  /** The app's display name. */
  APP_NAME = APP_NAME
  /** The logo size in pixels. */
  LOGO_SIZE = LOGO_SIZE

  /** The reset token from the URL. */
  token = this.route.snapshot.queryParamMap.get('token') || ''
  /** The account email from the URL. */
  email = this.route.snapshot.queryParamMap.get('email') || ''
  /** The new password. */
  password = ''
  /** The optional two-factor code (rendered, not sent — React parity). */
  twoFactorToken = ''
  /** Whether the confirmation is in flight. */
  isLoggingIn = false
  /** The last confirmation failure, rendered inline. */
  confirmError: Error | null = null

  ngOnInit(): void {
    this.subscriptions.push(
      this.resetManager.confirmState$.subscribe((state) => {
        this.isLoggingIn = state.status === 'pending'
        this.confirmError = state.error ?? null
        this.cdr.markForCheck()
      }),
    )
  }

  /**
   * Confirms the token with the new password, then signs the user in.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    try {
      await this.resetManager.confirmReset({ token: this.token, password: this.password })
      await this.loginManager.login({ email: this.email, password: this.password })
      await this.router.navigate(['/'], { replaceUrl: true })
    } catch (_error) {
      // Error tracked in the confirmation state and rendered inline above.
    }
  }

  /** Returns to the login page. */
  navigateToLogin(): void {
    void this.router.navigate(['/login'])
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.resetManager.destroy()
    this.loginManager.destroy()
  }
}
