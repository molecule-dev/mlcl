import { Component, inject, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { Router, ActivatedRoute } from '@angular/router'
import {
  AUTH_CLIENT,
  createPasswordResetState,
  createLoginState,
  t,
} from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { IconComponent } from '../components/icon.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-reset-password',
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
          <form (ngSubmit)="onSubmit()">
            <div [class]="cm.authField">
              <app-floating-input
                type="email"
                [value]="email"
                (valueChange)="email = $event"
                autocomplete="email"
                [autofocus]="!email"
                [required]="true"
                [placeholder]="t('auth.resetPassword.email')"
              ></app-floating-input>
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="password"
                [value]="token"
                (valueChange)="token = $event"
                [autofocus]="!!email && !token"
                [required]="true"
                [placeholder]="t('auth.resetPassword.token')"
              ></app-floating-input>
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="password"
                [value]="password"
                (valueChange)="password = $event"
                autocomplete="new-password"
                [required]="true"
                [placeholder]="t('auth.resetPassword.newPassword')"
              ></app-floating-input>
            </div>
            <div [class]="cm.authField">
              <app-floating-input
                type="number"
                [value]="twoFactorToken"
                (valueChange)="twoFactorToken = $event"
                autocomplete="one-time-code"
                [placeholder]="t('auth.resetPassword.twoFactor')"
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
                {{
                  pending ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')
                }}
              </mol-button>
            </div>
          </form>
          @if (confirmState$ | async; as confirmState) {
            @if (confirmState.error) {
              <div [class]="cm.authFormError">
                {{ confirmState.error.message }}
              </div>
            }
          }
        </div>
      </div>
      <app-footer />
    </div>
  `,
})
export class ResetPasswordComponent implements OnDestroy {
  private client = inject(AUTH_CLIENT)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private resetManager = createPasswordResetState(this.client)
  private loginManager = createLoginState(this.client)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE

  confirmState$ = this.resetManager.confirmState$
  email = ''
  token = ''
  password = ''
  twoFactorToken = ''
  pending = false

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['token']) this.token = params['token']
      if (params['email']) this.email = params['email']
    })

    this.resetManager.confirmState$.subscribe((state) => {
      this.pending = state.status === 'pending'
    })
  }

  async onSubmit(): Promise<void> {
    try {
      await this.resetManager.confirmReset({ token: this.token, password: this.password })
      await this.loginManager.login({ email: this.email, password: this.password })
      this.router.navigate(['/'], { replaceUrl: true })
    } catch {
      // Error tracked in state
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'])
  }

  ngOnDestroy(): void {
    this.resetManager.destroy()
    this.loginManager.destroy()
  }
}
