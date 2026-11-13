import './index.css'
import './theme.css'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { moleculePlugin } from '@molecule/app-vue'

import App from './App.vue'
import { setupProviders } from './bonds/index.js'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import AppLayout from './components/AppLayout.vue'
import AuthGuard from './components/AuthGuard.vue'
import About from './pages/About.vue'
import ForgotPassword from './pages/ForgotPassword.vue'
import Home from './pages/Home.vue'
import Login from './pages/Login.vue'
import PlanUpdated from './pages/PlanUpdated.vue'
import ResetPassword from './pages/ResetPassword.vue'
import Settings from './pages/Settings.vue'
import Signup from './pages/Signup.vue'
import { registerPWA } from './pwa.js'

setupProviders()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/signup', component: Signup },
    { path: '/about', component: About },
    { path: '/forgot-password', component: ForgotPassword },
    { path: '/reset-password', component: ResetPassword },
    {
      path: '/',
      component: AuthGuard,
      children: [
        {
          path: '',
          component: AppLayout,
          children: [
            { path: '', component: Home },
            { path: 'settings', component: Settings },
            { path: 'plan-updated', component: PlanUpdated },
          ],
        },
      ],
    },
  ],
})

const app = createApp(App)

app.use(moleculePlugin, {
  auth: authClient,
  i18n: i18nProvider,
  theme: themeProvider,
  http: getHttpClient(),
  storage: getStorageProvider(),
})

app.use(router)

// A failed restore leaves the app signed out and every guarded route redirects
// to /login; there is nothing to render for the failure itself.
authClient.initialize().catch((_error) => {
  /* restore is best-effort: a rejected initialize() means no session to restore */
})

app.mount('#root')

registerPWA()
