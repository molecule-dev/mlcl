import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { useLogin, useNavigate, usePasswordReset, useTranslation } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { Icon } from '../components/icon.component.js'
import { ThemeToggle } from '../components/theme-toggle.component.js'

/**
 * Reset-password page: confirms a reset token with a new password, then signs in.
 */
@Component({
  selector: 'app-reset-password',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, Flex, FloatingInput, FooterComponent, Icon, ThemeToggle],
  template: `
    <div [class]="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
      <header [class]="cm.cn(cm.headerBar, cm.headerFixed)">
        <div [class]="cm.authHeaderInner">
          <div mol-flex [align]="'center'" [justify]="'between'" [className]="cm.h('full')">
            <div mol-flex [align]="'center'" [gap]="'xs'">
              <img
                src="/logo.svg"
                [width]="LOGO_SIZE"
                [height]="LOGO_SIZE"
                alt=""
                [class]="cm.logoIcon"
              />
              <span [class]="cm.logoText">{{ APP_NAME }}</span>
            </div>
            <button mol-theme-toggle></button>
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
              <span
                mol-floating-input
                type="email"
                [value]="email"
                (change)="email = inputValue($event)"
                autocomplete="email"
                required
                [placeholder]="t('auth.resetPassword.email')"
              ></span>
            </div>
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="password"
                [value]="token"
                (change)="token = inputValue($event)"
                required
                [placeholder]="t('auth.resetPassword.token')"
              ></span>
            </div>
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="password"
                [value]="password"
                (change)="password = inputValue($event)"
                autocomplete="new-password"
                required
                [placeholder]="t('auth.resetPassword.newPassword')"
              ></span>
            </div>
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="number"
                [value]="twoFactorToken"
                (change)="twoFactorToken = inputValue($event)"
                autocomplete="one-time-code"
                [placeholder]="t('auth.resetPassword.twoFactor')"
              ></span>
            </div>
            <div [class]="cm.authButtonRow">
              <button
                mol-button
                type="button"
                size="lg"
                color="secondary"
                [className]="cm.authBackButton"
                (click)="navigateToLogin()"
                [attr.aria-label]="t('common.goBack')"
              >
                <svg mol-icon-root name="arrow-left" [size]="25"></svg>
              </button>
              <button
                mol-button
                type="submit"
                size="lg"
                color="success"
                [className]="cm.authSubmitButton"
                [disabled]="isLoggingIn()"
              >
                {{
                  isLoggingIn() ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')
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
export class ResetPasswordComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly reset = usePasswordReset()
  private readonly login = useLogin()
  private readonly navigate = useNavigate()
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** The app's display name. */
  protected readonly APP_NAME = APP_NAME
  /** The logo size in pixels. */
  protected readonly LOGO_SIZE = LOGO_SIZE

  /** The reset token from the URL (React's `useState(searchParams.get('token'))`). */
  protected token = this.route.snapshot.queryParamMap.get('token') || ''
  /** The account email from the URL (React's `useState(searchParams.get('email'))`). */
  protected email = this.route.snapshot.queryParamMap.get('email') || ''
  /** The new password. */
  protected password = ''
  /** The optional two-factor code (rendered, not sent — React parity). */
  protected twoFactorToken = ''

  /** Whether the confirmation is in flight (React's `confirmStatus === 'pending'`). */
  protected isLoggingIn(): boolean {
    return this.reset.confirmStatus === 'pending'
  }

  /** The last confirmation failure, rendered inline (React's `confirmError`). */
  protected get confirmError(): Error | null {
    return this.reset.confirmError
  }

  /**
   * Confirms the token with the new password, then signs the user in.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    try {
      await this.reset.confirmReset({ token: this.token, password: this.password })
      await this.login.login({ email: this.email, password: this.password })
      this.navigate('/', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  /**
   * Reads the typed value from the input event the UI FloatingInput re-emits.
   *
   * @param event - The native input event.
   * @returns The typed value.
   */
  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value
  }

  /** Returns to the login page. */
  protected navigateToLogin(): void {
    this.navigate('/login')
  }
}
