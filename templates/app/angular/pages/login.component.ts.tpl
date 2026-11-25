import { Component, effect, inject } from '@angular/core'
import { Router } from '@angular/router'

import { useAuth, useLogin, useNavigate, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/floating-input.component.js'
{{#feature footer}}
import { FooterComponent } from '../components/footer.component.js'
{{/feature}}
{{#feature oauth}}
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
{{/feature}}
import { ThemeToggle } from '../components/theme-toggle.component.js'

/**
 * Login page: email and password over the bonded auth client.
 */
@Component({
  selector: 'app-login',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
{{#feature oauth}}
{{#feature footer}}
  imports: [Button, Flex, FloatingInput, FooterComponent, Form, OAuthButtonsComponent, ThemeToggle],
{{/feature}}
{{^feature footer}}
  imports: [Button, Flex, FloatingInput, Form, OAuthButtonsComponent, ThemeToggle],
{{/feature}}
{{/feature}}
{{^feature oauth}}
{{#feature footer}}
  imports: [Button, Flex, FloatingInput, FooterComponent, Form, ThemeToggle],
{{/feature}}
{{^feature footer}}
  imports: [Button, Flex, FloatingInput, Form, ThemeToggle],
{{/feature}}
{{/feature}}
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
        <h1 [class]="cm.srOnly">{{ t('auth.login.logIn') }}</h1>
        <div [class]="cm.authFormWrapper">
          <form mol-form [onFormSubmit]="handleSubmit">
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="email"
                [value]="email"
                (change)="email = inputValue($event)"
                autocomplete="email"
                required
                [placeholder]="t('auth.login.email')"
              ></span>
            </div>
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="password"
                [value]="password"
                (change)="password = inputValue($event)"
                autocomplete="current-password"
                required
                [placeholder]="t('auth.login.password')"
              ></span>
            </div>
{{#feature two-factor}}
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="number"
                [value]="twoFactorToken"
                (change)="twoFactorToken = inputValue($event)"
                autocomplete="one-time-code"
                [placeholder]="t('auth.login.twoFactor')"
              ></span>
            </div>
{{/feature}}
            <div [class]="cm.authButtonRow">
              <button
                mol-button
                type="button"
                size="lg"
                [className]="isLoggingIn() ? cm.authHidden : cm.authLoginSignup"
                [disabled]="isLoggingIn()"
                (click)="navigateToSignup()"
              >
                {{ t('auth.login.signUp') }}
              </button>
              <button
                mol-button
                type="submit"
                size="lg"
                color="success"
                [className]="isLoggingIn() ? cm.authLoginSubmitFull : cm.authLoginSubmit"
                [disabled]="isLoggingIn()"
              >
                {{ isLoggingIn() ? t('auth.login.loggingIn') : t('auth.login.logIn') }}
              </button>
            </div>
          </form>
{{#feature emails}}
          <div [class]="cm.authAfterSubmit">
            <button
              type="button"
              (click)="navigateToForgotPassword()"
              [class]="cm.forgotPasswordLink"
            >
              {{ t('auth.login.forgotPassword') }}
            </button>
          </div>
{{/feature}}
{{#feature oauth}}
          <app-oauth-buttons />
{{/feature}}
        </div>
      </main>
{{#feature footer}}
      <app-footer />
{{/feature}}
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = useAuth<UserProfile>()
  private readonly login = useLogin()
  private readonly navigate = useNavigate()
  private readonly i18n = useTranslation()
  private readonly router = inject(Router)

  /** The page to return to after a successful login. */
  private readonly from: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** The app's display name. */
  protected readonly APP_NAME = APP_NAME
  /** The logo size in pixels. */
  protected readonly LOGO_SIZE = LOGO_SIZE

  /** The entered email address. */
  protected email = ''
  /** The entered password. */
  protected password = ''
{{#feature two-factor}}
  /** The optional two-factor code. */
  protected twoFactorToken = ''
{{/feature}}

  constructor() {
    // React reads `location.state` in the first render; a component built for
    // an in-flight navigation reads it here — `getCurrentNavigation()` is only
    // readable while the navigation that created this component is in flight.
    this.from = this.resolveReturnPath()
    // Route into the app whenever a session exists — covers the OAuth callback
    // completing on this page (its exchange sets auth state without a submit)
    // and an already-authenticated user landing on /login directly.
    effect(() => {
      if (this.auth.isAuthenticated()) this.navigate(this.from, { replace: true })
    })
  }

  /** Whether a login request is in flight (React's `status === 'pending'`). */
  protected isLoggingIn(): boolean {
    return this.login.status === 'pending'
  }

  /**
   * The page the guard tried to reach before redirecting here (React's
   * `location.state.from.pathname`).
   *
   * @returns The pathname to return to, or `/`.
   */
  private resolveReturnPath(): string {
    const state = this.router.getCurrentNavigation()?.extras.state
    const from = state ? (state as { from?: { pathname?: string } }).from : undefined
    return from?.pathname || '/'
  }

  /**
   * Logs in with the entered credentials. The submit envelope is the shared
   * `<Form>`'s: a rejected handler renders its accessible server-error list,
   * a new submit clears the previous failure, and the controls sit in a
   * fieldset disabled while the handler runs.
{{#feature two-factor}}
   *
   * The 2FA field is always rendered; only send a token when the user
   * typed one (a 2FA-enabled account gets `twoFactorRequired` back and
   * stays on this page until a valid code is entered).
{{/feature}}
   */
  protected readonly handleSubmit = async (): Promise<void> => {
{{#feature two-factor}}
    const result = await this.login.login({
      email: this.email,
      password: this.password,
      ...(this.twoFactorToken.trim() ? { twoFactorToken: this.twoFactorToken.trim() } : {}),
    })
    if (result.twoFactorRequired) return
{{/feature}}
{{^feature two-factor}}
    await this.login.login({ email: this.email, password: this.password })
{{/feature}}
    this.navigate(this.from, { replace: true })
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

  /** Opens the signup page. */
  protected navigateToSignup(): void {
    this.navigate('/signup')
  }
{{#feature emails}}

  /** Opens the forgot-password page. */
  protected navigateToForgotPassword(): void {
    this.navigate('/forgot-password')
  }
{{/feature}}
}
