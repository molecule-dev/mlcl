import './index.css'
import './theme.css'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { setRouter } from '@molecule/app-routing'
import { createVueRouter } from '@molecule/app-routing-vue-router'
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

// One molecule Router over this Vue Router: `useRouter()` from @molecule/app-vue and
// every molecule package that calls `getRouter()` navigate through it (SPA navigation,
// the entry's state and key kept), as React's `BrowserRouter` does.
const moleculeRouter = createVueRouter({ router })
setRouter(moleculeRouter)

const app = createApp(App)

app.use(moleculePlugin, {
  auth: authClient,
  i18n: i18nProvider,
  theme: themeProvider,
  http: getHttpClient(),
  storage: getStorageProvider(),
  router: moleculeRouter,
})

app.use(router)

// Restore the stored session before the first page renders. A rejected restore
// needs no handling here: the client keeps the stored token on a network/5xx
// failure, settles its status as 'unavailable', and publishes that through the
// auth store — AuthGuard and every page read the status, not this promise — so
// nothing is lost by not reporting it twice.
authClient.initialize().catch((_error) => {
  // Intentionally ignored: the failure is already published as auth status.
})

app.mount('#root')

registerPWA()
