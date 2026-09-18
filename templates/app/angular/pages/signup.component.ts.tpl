import { Component, inject, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { Router } from '@angular/router'
import { AUTH_CLIENT, createSignupState, t } from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { FloatingInputComponent } from '../components/floating-input.component.js'
import { IconComponent } from '../components/icon.component.js'
import { OAuthButtonsComponent } from '../components/oauth-buttons.component.js'
import { FooterComponent } from '../components/footer.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [AsyncPipe, MoleculeButton, FloatingInputComponent, IconComponent, OAuthButtonsComponent, FooterComponent, ThemeToggleComponent],
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
          @if (signupState$ | async; as signupState) {
            <form (ngSubmit)="onSubmit()">
              <div [class]="cm.authField">
                <app-floating-input
                  type="email"
                  [value]="email"
                  (valueChange)="email = $event"
                  autocomplete="email"
                  [autofocus]="true"
                  [required]="true"
                  [placeholder]="t('auth.signup.email')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="password"
                  [value]="password"
                  (valueChange)="password = $event"
                  autocomplete="new-password"
                  [required]="true"
                  [placeholder]="t('auth.signup.password')"
                ></app-floating-input>
              </div>
              <div [class]="cm.authField">
                <app-floating-input
                  type="text"
                  [value]="name"
                  (valueChange)="name = $event"
                  autocomplete="name"
                  [placeholder]="t('auth.signup.name')"
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
                  [disabled]="signupState.status === 'pending'"
                  [loading]="signupState.status === 'pending'"
                >
                  {{
                    signupState.status === 'pending'
                      ? t('auth.signup.signingUp')
                      : t('auth.signup.signUp')
                  }}
                </mol-button>
              </div>
            </form>
            @if (signupState.error) {
              <div [class]="cm.authFormError">
                {{ signupState.error.message }}
              </div>
            }
          }
          <app-oauth-buttons />
        </div>
      </div>
      <app-footer />
    </div>
  `,
})
export class SignupComponent implements OnDestroy {
  private client = inject(AUTH_CLIENT)
  private router = inject(Router)
  private signupManager = createSignupState(this.client)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE

  signupState$ = this.signupManager.state$
  email = ''
  password = ''
  name = ''

  async onSubmit(): Promise<void> {
    try {
      await this.signupManager.signup({
        email: this.email,
        password: this.password,
        name: this.name || undefined,
      })
      this.router.navigate(['/'], { replaceUrl: true })
    } catch {
      // Error tracked in signup state
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'])
  }

  ngOnDestroy(): void {
    this.signupManager.destroy()
  }
}
