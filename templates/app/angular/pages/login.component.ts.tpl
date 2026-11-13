import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { Router } from '@angular/router'
import type { Subscription } from 'rxjs'

import { AUTH_CLIENT, createLoginState, MoleculeAuthService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ButtonComponent } from '../components/button.component.js'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { formSubmitErrorMessages } from '../components/form-submit-error.js'
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'

/**
 * Login page: email + password (+ optional two-factor code) over the bonded
 * auth client, with the OAuth provider row beneath the form.
 *
 * Port of the React `Login` page. The submission envelope is the React `<Form>`
 * component's: a rejected handler renders an accessible server-error list, a
 * new submit clears the previous failure, and the controls sit in a fieldset
 * disabled while the handler runs.
 */
@Component({
  selector: 'app-login',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [
    ButtonComponent,
    FloatingInputComponent,
    OAuthButtonsComponent,
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
        <h1 [class]="cm.srOnly">{{ t('auth.login.logIn') }}</h1>
        <div [class]="cm.authFormWrapper">
          <form (submit)="onSubmit($event)">
            @if (errorMessages.length > 0) {
              <ul role="alert" [class]="cm.formError">
                @for (message of errorMessages; track $index) {
                  <li>{{ message }}</li>
                }
              </ul>
            }
            <fieldset [attr.disabled]="pending ? '' : null" [class]="cm.formFieldsetContents">
              <div [class]="cm.authField">
                <app-floating-input
                  type="email"
                  [value]="email"
                  (valueChange)="email = $event"
                  autocomplete="email"
                  [required]="true"
                  [placeholder]="t('auth.login.email')"
                />
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="password"
                  [value]="password"
                  (valueChange)="password = $event"
                  autocomplete="current-password"
                  [required]="true"
                  [placeholder]="t('auth.login.password')"
                />
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="number"
                  [value]="twoFactorToken"
                  (valueChange)="twoFactorToken = $event"
                  autocomplete="one-time-code"
                  [placeholder]="t('auth.login.twoFactor')"
                />
              </div>
              <div [class]="cm.authButtonRow">
                <button
                  appButton
                  type="button"
                  size="lg"
                  [className]="isLoggingIn ? cm.authHidden : cm.authLoginSignup"
                  [disabled]="isLoggingIn"
                  (click)="navigateToSignup()"
                >
                  {{ t('auth.login.signUp') }}
                </button>
                <button
                  appButton
                  type="submit"
                  size="lg"
                  color="success"
                  [className]="isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit"
                  [disabled]="isLoggingIn"
                >
                  {{ isLoggingIn ? t('auth.login.loggingIn') : t('auth.login.logIn') }}
                </button>
              </div>
            </fieldset>
          </form>
          <div [class]="cm.authAfterSubmit">
            <button
              type="button"
              (click)="navigateToForgotPassword()"
              [class]="cm.forgotPasswordLink"
            >
              {{ t('auth.login.forgotPassword') }}
            </button>
          </div>
          <app-oauth-buttons />
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly client = inject(AUTH_CLIENT)
  private readonly router = inject(Router)
  private readonly authService = inject(MoleculeAuthService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly loginManager = createLoginState(this.client)
  private readonly subscriptions: Subscription[] = []

  /** The page to return to after a successful login. */
  private readonly from: string
  /** The number of the in-flight submit (a late result is ignored). */
  private attempt = 0

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

  /** The entered email address. */
  email = ''
  /** The entered password. */
  password = ''
  /** The optional two-factor code. */
  twoFactorToken = ''
  /** Whether a login request is in flight. */
  isLoggingIn = false
  /** The rejected submission, rendered as the form's error list. */
  failure: unknown = null
  /** Whether the submit handler is running (disables the fieldset). */
  pending = false

  constructor() {
    // `getCurrentNavigation()` is only readable while the navigation that
    // created this component is still in flight.
    this.from = this.resolveReturnPath()
  }

  ngOnInit(): void {
    // Route into the app whenever a session exists — covers the OAuth callback
    // completing on this page (its exchange sets auth state without a submit)
    // and an already-authenticated user landing on /login directly.
    this.subscriptions.push(
      this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
        if (isAuthenticated) void this.router.navigate([this.from], { replaceUrl: true })
      }),
      this.loginManager.state$.subscribe((state) => {
        this.isLoggingIn = state.status === 'pending'
        this.cdr.markForCheck()
      }),
    )
  }

  /** The form's error messages (the React `<Form>` list). */
  get errorMessages(): string[] {
    return this.failure
      ? formSubmitErrorMessages(
          this.failure,
          t('ui.form.submitError', undefined, {
            defaultValue: 'Unable to submit. Please try again.',
          }),
        )
      : []
  }

  /**
   * The page the guard tried to reach before redirecting here.
   *
   * @returns The pathname to return to, or `/`.
   */
  private resolveReturnPath(): string {
    const state = this.router.getCurrentNavigation()?.extras.state
    const from = state ? (state as { from?: { pathname?: string } }).from : undefined
    return from?.pathname || '/'
  }

  /**
   * Submits the form; a rejection becomes the visible error list.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    const current = ++this.attempt
    this.failure = null
    this.pending = true
    try {
      await this.handleSubmit()
    } catch (submitError) {
      if (this.attempt === current) this.failure = submitError
    } finally {
      if (this.attempt === current) this.pending = false
    }
  }

  /**
   * Logs in with the entered credentials.
   *
   * The 2FA field is always rendered; only a token the user typed is sent (a
   * 2FA-enabled account gets `twoFactorRequired` back and stays on this page
   * until a valid code is entered).
   */
  async handleSubmit(): Promise<void> {
    const result = await this.loginManager.login({
      email: this.email,
      password: this.password,
      ...(this.twoFactorToken.trim() ? { twoFactorToken: this.twoFactorToken.trim() } : {}),
    })
    if (result.twoFactorRequired) return
    await this.router.navigate([this.from], { replaceUrl: true })
  }

  /** Opens the signup page. */
  navigateToSignup(): void {
    void this.router.navigate(['/signup'])
  }

  /** Opens the forgot-password page. */
  navigateToForgotPassword(): void {
    void this.router.navigate(['/forgot-password'])
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.loginManager.destroy()
  }
}
