import { Component, inject, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { Router } from '@angular/router'
import { AUTH_CLIENT, createLoginState, t } from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    AsyncPipe,
    MoleculeButton,
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
              <img src="/logo.svg" [width]="LOGO_SIZE" [height]="LOGO_SIZE" alt="" [class]="cm.logoIcon" />
              <span [class]="cm.logoText">{{ APP_NAME }}</span>
            </div>
            <app-theme-toggle />
          </div>
        </div>
      </header>
      <div [class]="cm.authPageBody">
        <div [class]="cm.authFormWrapper">
          @if (loginState$ | async; as loginState) {
            <form (ngSubmit)="onSubmit()">
              <div [class]="cm.authField">
                <app-floating-input
                  type="email"
                  [value]="email"
                  (valueChange)="email = $event"
                  autocomplete="email"
                  [autofocus]="true"
                  [required]="true"
                  [placeholder]="t('auth.login.email')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="password"
                  [value]="password"
                  (valueChange)="password = $event"
                  autocomplete="current-password"
                  [required]="true"
                  [placeholder]="t('auth.login.password')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="number"
                  [value]="twoFactorToken"
                  (valueChange)="twoFactorToken = $event"
                  autocomplete="one-time-code"
                  [placeholder]="t('auth.login.twoFactor')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authButtonRow">
                <mol-button
                  type="button"
                  size="lg"
                  [className]="loginState.status === 'pending' ? cm.authHidden : cm.authLoginSignup"
                  [disabled]="loginState.status === 'pending'"
                  (handleClick)="navigateToSignup()"
                >
                  {{ t('auth.login.signUp') }}
                </mol-button>
                <mol-button
                  type="submit"
                  size="lg"
                  color="success"
                  [className]="loginState.status === 'pending' ? cm.authLoginSubmitFull : cm.authLoginSubmit"
                  [disabled]="loginState.status === 'pending'"
                  [loading]="loginState.status === 'pending'"
                >
                  {{
                    loginState.status === 'pending' ? t('auth.login.loggingIn') : t('auth.login.logIn')
                  }}
                </mol-button>
              </div>
            </form>
            @if (loginState.error) {
              <div [class]="cm.authFormError">
                {{ loginState.error.message }}
              </div>
            }
          }
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
      </div>
      <app-footer />
    </div>
  `,
})
export class LoginComponent implements OnDestroy {
  private client = inject(AUTH_CLIENT)
  private router = inject(Router)
  private loginManager = createLoginState(this.client)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE

  loginState$ = this.loginManager.state$
  email = ''
  password = ''
  twoFactorToken = ''

  async onSubmit(): Promise<void> {
    try {
      await this.loginManager.login({ email: this.email, password: this.password })
      this.router.navigate(['/'])
    } catch {
      // Error tracked in login state
    }
  }

  navigateToSignup(): void {
    this.router.navigate(['/signup'])
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password'])
  }

  ngOnDestroy(): void {
    this.loginManager.destroy()
  }
}
