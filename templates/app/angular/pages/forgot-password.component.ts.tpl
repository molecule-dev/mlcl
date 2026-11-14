import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { Router } from '@angular/router'
import type { Subscription } from 'rxjs'

import { AUTH_CLIENT, createPasswordResetState, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { IconComponent } from '../components/icon.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'

/**
 * Forgot-password page: requests a reset link for an email address.
 *
 * Port of the React `ForgotPassword` page — the fixed auth header with the app
 * name and theme toggle, a screen-reader-only `h1` (the visual design has no
 * heading), the request form with its back/submit row, the inline
 * `role="alert"` error, and the confirmation branch with the continue button.
 */
@Component({
  selector: 'app-forgot-password',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, FloatingInputComponent, IconComponent, FooterComponent, ThemeToggleComponent],
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
        <h1 [class]="cm.srOnly">{{ t('auth.login.forgotPassword') }}</h1>
        <div [class]="cm.authFormWrapper">
          @if (!submitted) {
            <form (submit)="onSubmit($event)">
              <div [class]="cm.authField">
                <app-floating-input
                  type="email"
                  [value]="email"
                  (valueChange)="email = $event"
                  autocomplete="email"
                  [required]="true"
                  [placeholder]="t('auth.forgotPassword.email')"
                />
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
                  <svg appIcon name="arrow-left" [size]="25"></svg>
                </button>
                <button
                  mol-button
                  type="submit"
                  size="lg"
                  color="success"
                  [className]="cm.authSubmitButton"
                  [disabled]="isSubmitting"
                >
                  {{ isSubmitting ? t('auth.forgotPassword.submitting') : t('common.submit') }}
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
                <svg appIcon name="arrow-left" [size]="25"></svg>
              </button>
              <button
                mol-button
                size="lg"
                color="success"
                [className]="cm.authSubmitButton"
                (click)="navigateToResetPassword()"
              >
                {{ t('common.continue') }}
                <svg appIcon name="arrow-right" [size]="20" [className]="cm.authArrowIcon"></svg>
              </button>
            </div>
          }
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private readonly client = inject(AUTH_CLIENT)
  private readonly router = inject(Router)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly resetManager = createPasswordResetState(this.client)
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

  /** The requested email address. */
  email = ''
  /** Whether the request was accepted (shows the confirmation branch). */
  submitted = false
  /** Whether a request is in flight. */
  isSubmitting = false
  /** The confirmation message shown after a successful request. */
  message = ''
  /** The last request failure, rendered inline. */
  requestError: Error | null = null

  ngOnInit(): void {
    this.subscriptions.push(
      this.resetManager.requestState$.subscribe((state) => {
        this.isSubmitting = state.status === 'pending'
        this.requestError = state.error ?? null
        this.cdr.markForCheck()
      }),
    )
  }

  /**
   * Requests a password-reset link for the entered email.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    try {
      await this.resetManager.requestReset({ email: this.email })
      this.message = t('auth.forgotPassword.success')
      this.submitted = true
    } catch (_error) {
      // Error tracked in the request state and rendered inline above.
    }
  }

  /** Returns to the login page. */
  navigateToLogin(): void {
    void this.router.navigate(['/login'])
  }

  /** Continues to the reset-password page. */
  navigateToResetPassword(): void {
    void this.router.navigate(['/reset-password'])
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.resetManager.destroy()
  }
}
