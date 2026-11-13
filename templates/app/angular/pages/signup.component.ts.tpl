import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { Router } from '@angular/router'
import type { Subscription } from 'rxjs'

import { AUTH_CLIENT, createSignupState, MoleculeAuthService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ButtonComponent } from '../components/button.component.js'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { formSubmitErrorMessages } from '../components/form-submit-error.js'
import { IconComponent } from '../components/icon.component.js'
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'

/**
 * Signup page: email + password + optional name over the bonded auth client,
 * with the OAuth provider row beneath the form.
 *
 * Port of the React `Signup` page. The submission envelope is the React
 * `<Form>` component's: a rejected handler renders an accessible server-error
 * list, a new submit clears the previous failure, and the controls sit in a
 * fieldset disabled while the handler runs.
 */
@Component({
  selector: 'app-signup',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [
    ButtonComponent,
    FloatingInputComponent,
    IconComponent,
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
        <h1 [class]="cm.srOnly">{{ t('auth.signup.signUp') }}</h1>
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
                  [placeholder]="t('auth.signup.email')"
                />
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="password"
                  [value]="password"
                  (valueChange)="password = $event"
                  autocomplete="new-password"
                  [required]="true"
                  [placeholder]="t('auth.signup.password')"
                />
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="text"
                  [value]="name"
                  (valueChange)="name = $event"
                  autocomplete="name"
                  [placeholder]="t('auth.signup.name')"
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
                  [disabled]="isSigningUp"
                >
                  {{ isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp') }}
                </button>
              </div>
            </fieldset>
          </form>
          <app-oauth-buttons />
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class SignupComponent implements OnInit, OnDestroy {
  private readonly client = inject(AUTH_CLIENT)
  private readonly router = inject(Router)
  private readonly authService = inject(MoleculeAuthService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly signupManager = createSignupState(this.client)
  private readonly subscriptions: Subscription[] = []

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
  /** The optional display name. */
  name = ''
  /** Whether a signup request is in flight. */
  isSigningUp = false
  /** The rejected submission, rendered as the form's error list. */
  failure: unknown = null
  /** Whether the submit handler is running (disables the fieldset). */
  pending = false

  ngOnInit(): void {
    // Route into the app whenever a session exists — covers the OAuth callback
    // completing on this page (its exchange sets auth state without a submit)
    // and an already-authenticated user landing on /signup directly.
    this.subscriptions.push(
      this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
        if (isAuthenticated) void this.router.navigate(['/'], { replaceUrl: true })
      }),
      this.signupManager.state$.subscribe((state) => {
        this.isSigningUp = state.status === 'pending'
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

  /** Registers the account and enters the app. */
  async handleSubmit(): Promise<void> {
    await this.signupManager.signup({
      email: this.email,
      password: this.password,
      name: this.name || undefined,
    })
    await this.router.navigate(['/'], { replaceUrl: true })
  }

  /** Returns to the login page. */
  navigateToLogin(): void {
    void this.router.navigate(['/login'])
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.signupManager.destroy()
  }
}
