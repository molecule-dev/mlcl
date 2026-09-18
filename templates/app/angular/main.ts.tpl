import 'zone.js'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter, type Routes } from '@angular/router'
import { setupProviders } from './bonds/index.js'
import './index.css'
import './theme.css'
import { provideMolecule } from '@molecule/app-angular'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { registerPWA } from './pwa.js'
import { AppComponent } from './app.component.js'
import { authGuard } from './components/auth.guard.js'

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login.component.js').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup.component.js').then((m) => m.SignupComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component.js').then((m) => m.AboutComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password.component.js').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password.component.js').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/app-layout.component.js').then(
        (m) => m.AppLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home.component.js').then((m) => m.HomeComponent),
      },
      {
        path: 'plan-updated',
        loadComponent: () =>
          import('./pages/plan-updated.component.js').then(
            (m) => m.PlanUpdatedComponent,
          ),
      },
    ],
  },
]

setupProviders()

authClient.initialize().catch(() => {})

bootstrapApplication(AppComponent, {
  providers: [
    provideMolecule({
      auth: authClient,
      i18n: i18nProvider,
      theme: themeProvider,
      http: getHttpClient(),
      storage: getStorageProvider(),
    }),
    provideRouter(routes),
  ],
})

registerPWA()
