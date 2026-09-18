import { Component, inject, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { Router } from '@angular/router'
import { AUTH_CLIENT, createPasswordResetState, t } from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { IconComponent } from '../components/icon.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [AsyncPipe, MoleculeButton, FloatingInputComponent, IconComponent, FooterComponent, ThemeToggleComponent],
  template: `
    <div [class]="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
      <header [class]="cm.cn(cm.headerBar, cm.headerFixed)">
        <div [class]="cm.authHeaderInner">
          <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h('full'))">
            <div [class]="cm.flex({ align: 'center', gap: 'xs' })">
              <img src="/logo.svg" [width]="LOGO_SIZE" [height]="LOGO_SIZE" alt="" [class]="cm.logoIcon" />
              <span [class]="cm.logoText">{{ APP_NAME }}</span>
            </div>
            <app-theme-toggle />
          </div>
        </div>
      </header>
      <div [class]="cm.authPageBody">
        <div [class]="cm.authFormWrapper">
          @if (!submitted) {
            <form (ngSubmit)="onSubmit()">
              <div [class]="cm.authField">
                <app-floating-input
                  type="email"
                  [value]="email"
                  (valueChange)="email = $event"
                  autocomplete="email"
                  [autofocus]="true"
                  [required]="true"
                  [placeholder]="t('auth.forgotPassword.email')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authButtonRow">
                <mol-button
                  type="button"
                  size="lg"
                  color="secondary"
                  [className]="cm.authBackButton"
                  (handleClick)="navigateToLogin()"
                  [attr.aria-label]="t('common.goBack')"
                >
                  <app-icon name="arrow-left" [size]="25" />
                </mol-button>
                <mol-button
                  type="submit"
                  size="lg"
                  color="success"
                  [className]="cm.authSubmitButton"
                  [disabled]="pending"
                  [loading]="pending"
                >
                  {{ pending ? t('auth.forgotPassword.submitting') : t('common.submit') }}
                </mol-button>
              </div>
            </form>
            @if (requestState$ | async; as requestState) {
              @if (requestState.error) {
                <div [class]="cm.authFormError">
                  {{ requestState.error.message }}
                </div>
              }
            }
          } @else {
            <div>
              <p [class]="cm.authField">
                {{ message }}
              </p>
              <div [class]="cm.authButtonRow">
                <mol-button
                  type="button"
                  size="lg"
                  color="secondary"
                  [className]="cm.authBackButton"
                  (handleClick)="navigateToLogin()"
                  [attr.aria-label]="t('common.goBack')"
                >
                  <app-icon name="arrow-left" [size]="25" />
                </mol-button>
                <mol-button
                  size="lg"
                  color="success"
                  [className]="cm.authSubmitButton"
                  (handleClick)="navigateToResetPassword()"
                >
                  {{ t('common.continue') }}
                  <app-icon name="arrow-right" [size]="20" [iconClass]="cm.authArrowIcon" />
                </mol-button>
              </div>
            </div>
          }
        </div>
      </div>
      <app-footer />
    </div>
  `,
})
export class ForgotPasswordComponent implements OnDestroy {
  private client = inject(AUTH_CLIENT)
  private router = inject(Router)
  private resetManager = createPasswordResetState(this.client)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE

  requestState$ = this.resetManager.requestState$
  email = ''
  submitted = false
  pending = false
  message = ''

  constructor() {
    this.resetManager.requestState$.subscribe((state) => {
      this.pending = state.status === 'pending'
    })
  }

  async onSubmit(): Promise<void> {
    try {
      await this.resetManager.requestReset({ email: this.email })
      this.message = t('auth.forgotPassword.success')
      this.submitted = true
    } catch {
      // Error tracked in state
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'])
  }

  navigateToResetPassword(): void {
    this.router.navigate(['/reset-password'])
  }

  ngOnDestroy(): void {
    this.resetManager.destroy()
  }
}
