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
import { AuthGuardComponent } from './components/auth.guard.js'
import { AppLayoutComponent } from './components/app-layout.component.js'

// The page set is small (about 45 KB gzip), so the routes below are the whole
// application. A full document load can land on ANY route here (a deep link, or
// a session restored from storage by `authClient.initialize()`), so the shell
// (`AuthGuardComponent` + `AppLayoutComponent`) is imported statically and only
// the page bodies are loaded on demand — Angular's idiom for the same decision
// the React template documents for its static page imports.
const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component.js').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup.component.js').then((m) => m.SignupComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about.component.js').then((m) => m.AboutComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password.component.js').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password.component.js').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '',
    component: AuthGuardComponent,
    children: [
      {
        path: '',
        component: AppLayoutComponent,
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/home.component.js').then((m) => m.HomeComponent),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./pages/settings.component.js').then((m) => m.SettingsComponent),
          },
          {
            path: 'plan-updated',
            loadComponent: () =>
              import('./pages/plan-updated.component.js').then((m) => m.PlanUpdatedComponent),
          },
        ],
      },
    ],
  },
]

setupProviders()

authClient.initialize().catch(() => {})

bootstrapApplication(AppComponent, {
  providers: [
    // Hold bootstrap while the initial session status is 'loading', so public
    // actions see the restored user when restoration succeeds. 'unavailable'
    // also renders and may have a null user. Without a session hint, an anonymous
    // visitor settles in microtasks without a request. Keep it.
    provideMolecule({
      auth: authClient,
      awaitSession: true,
      i18n: i18nProvider,
      theme: themeProvider,
      http: getHttpClient(),
      storage: getStorageProvider(),
    }),
    provideRouter(routes),
  ],
})

registerPWA()
