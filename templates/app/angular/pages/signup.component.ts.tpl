import { Component, effect } from '@angular/core'

import { useAuth, useNavigate, useSignup, useTranslation } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { Icon } from '../components/icon.component.js'
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
import { ThemeToggle } from '../components/theme-toggle.component.js'

/**
 * Signup page: email + password + optional name over the bonded auth client,
 * with the OAuth provider row beneath the form.
 */
@Component({
  selector: 'app-signup',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [
    Button,
    Flex,
    FloatingInput,
    FooterComponent,
    Form,
    Icon,
    OAuthButtonsComponent,
    ThemeToggle,
  ],
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
        <h1 [class]="cm.srOnly">{{ t('auth.signup.signUp') }}</h1>
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
                [placeholder]="t('auth.signup.email')"
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
                [placeholder]="t('auth.signup.password')"
              ></span>
            </div>
            <div [class]="cm.authField">
              <span
                mol-floating-input
                type="text"
                [value]="name"
                (change)="name = inputValue($event)"
                autocomplete="name"
                [placeholder]="t('auth.signup.name')"
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
                [disabled]="isSigningUp()"
              >
                {{ isSigningUp() ? t('auth.signup.signingUp') : t('auth.signup.signUp') }}
              </button>
            </div>
          </form>
          <app-oauth-buttons />
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class SignupComponent {
  private readonly auth = useAuth()
  private readonly signup = useSignup()
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

  /** The entered email address. */
  protected email = ''
  /** The entered password. */
  protected password = ''
  /** The optional display name. */
  protected name = ''

  constructor() {
    // Route into the app whenever a session exists — covers the OAuth callback
    // completing on this page (its exchange sets auth state without a submit)
    // and an already-authenticated user landing on /signup directly.
    effect(() => {
      if (this.auth.isAuthenticated()) this.navigate('/', { replace: true })
    })
  }

  /** Whether a signup request is in flight (React's `status === 'pending'`). */
  protected isSigningUp(): boolean {
    return this.signup.status === 'pending'
  }

  /**
   * Registers the account and enters the app. The submit envelope is the
   * shared `<Form>`'s: a rejected handler renders its accessible server-error
   * list, a new submit clears the previous failure, and the controls sit in a
   * fieldset disabled while the handler runs.
   */
  protected readonly handleSubmit = async (): Promise<void> => {
    await this.signup.signup({
      email: this.email,
      password: this.password,
      name: this.name || undefined,
    })
    this.navigate('/', { replace: true })
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
