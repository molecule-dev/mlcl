import { Component } from '@angular/core'

import { useNavigate, usePasswordReset, useTranslation } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { Icon } from '../components/icon.component.js'
import { ThemeToggle } from '../components/theme-toggle.component.js'

/**
 * Forgot-password page: requests a reset link for an email address.
 */
@Component({
  selector: 'app-forgot-password',
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
        <h1 [class]="cm.srOnly">{{ t('auth.login.forgotPassword') }}</h1>
        <div [class]="cm.authFormWrapper">
          @if (!submitted) {
            <form (submit)="onSubmit($event)">
              <div [class]="cm.authField">
                <span
                  mol-floating-input
                  type="email"
                  [value]="email"
                  (change)="email = inputValue($event)"
                  autocomplete="email"
                  required
                  [placeholder]="t('auth.forgotPassword.email')"
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
                  [disabled]="isSubmitting()"
                >
                  {{ isSubmitting() ? t('auth.forgotPassword.submitting') : t('common.submit') }}
                </button>
              </div>
            </form>
            @if (requestError) {
              <div [class]="cm.authFormError" role="alert">{{ requestError.message }}</div>
            }
          } @else {
            <p [class]="cm.authField">{{ message }}</p>
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
                size="lg"
                color="success"
                [className]="cm.authSubmitButton"
                (click)="navigateToResetPassword()"
              >
                {{ t('common.continue') }}
                <svg
                  mol-icon-root
                  name="arrow-right"
                  [size]="20"
                  [className]="cm.authArrowIcon"
                ></svg>
              </button>
            </div>
          }
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly reset = usePasswordReset()
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

  /** The requested email address. */
  protected email = ''
  /** Whether the request was accepted (shows the confirmation branch). */
  protected submitted = false
  /** The confirmation message shown after a successful request. */
  protected message = ''

  /** Whether a request is in flight (React's `requestStatus === 'pending'`). */
  protected isSubmitting(): boolean {
    return this.reset.requestStatus === 'pending'
  }

  /** The last request failure, rendered inline (React's `requestError`). */
  protected get requestError(): Error | null {
    return this.reset.requestError
  }

  /**
   * Requests a password-reset link for the entered email.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    try {
      await this.reset.requestReset({ email: this.email })
      this.message = this.t('auth.forgotPassword.success')
      this.submitted = true
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

  /** Continues to the reset-password page. */
  protected navigateToResetPassword(): void {
    this.navigate('/reset-password')
  }
}
